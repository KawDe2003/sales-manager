import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StoreContext } from '../context/StoreContext';
import {
  Lock, Mail, User, AlertCircle, CheckCircle, ShieldCheck, Eye, EyeOff,
  Loader2, KeyRound, X, Shield, Briefcase, Calculator, Building2,
  ArrowRight, Building, Cloud, Receipt, Scale, Check
} from 'lucide-react';

const PORTAL_INFO = {
  id: 'biz_main',
  name: 'Seynex Enterprises',
  shortName: 'Seynex',
  tagline: 'Sales, Biometric Cloud Billing & ERP Suite',
  domainHint: '@seynex.lk',
  supportDepartment: 'Seynex IT Support & Security Operations',
  supportEmail: 'seynextech@gmail.com',
  supportPhone: '+94 11 234 5678',
  supportLocation: 'Colombo 03 Headquarters, Sri Lanka',
  demoAccounts: [
    { label: 'System Admin', roleBadge: 'Executive', icon: Shield, e: 'admin@seynex.lk', p: 'seynex2026' },
    { label: 'Sales Rep', roleBadge: 'Enterprise Sales', icon: Briefcase, e: 'sales@seynex.lk', p: 'seynex2026' },
    { label: 'Accountant', roleBadge: 'Finance', icon: Calculator, e: 'accounts@seynex.lk', p: 'seynex2026' }
  ]
};

const Login = () => {
  const { smsConfig = {}, activeBusiness } = useContext(StoreContext) || {};
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const isDemoMode = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';

  const brandName = smsConfig.dashboardName || smsConfig.companyName || activeBusiness?.name || PORTAL_INFO.name;
  const logoSrc = smsConfig.receiptLogo || smsConfig.companyLogo || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  const handleQuickFill = (e, roleEmail, rolePass) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    setShakeError(false);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error('Please enter your email address.');
      if (!password) throw new Error('Please enter your password.');

      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your full name.');
        const { error: signUpErr } = await signUp({
          email: cleanEmail,
          password,
          name: name.trim(),
          businessId: 'biz_main'
        });
        if (signUpErr) throw signUpErr;
        setMessage(`Account created for ${brandName}. Redirecting...`);
        navigate('/', { replace: true });
      } else {
        const { error: signInErr } = await signIn({
          email: cleanEmail,
          password,
          targetBusinessId: 'biz_main'
        });
        if (signInErr) throw signInErr;
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 450);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-root" style={{
      minHeight: '100svh',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
      background: 'var(--bg, #0d1117)',
      color: 'var(--text, #f8fafc)',
      fontFamily: 'var(--font-family, "Inter", -apple-system, BlinkMacSystemFont, sans-serif)'
    }}>
      {/* LEFT PANEL: ARCHITECTURAL BRAND & SYSTEM PILLARS */}
      <aside className="login-brand-pane" style={{
        backgroundColor: '#0b0f17',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '44px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#f8fafc'
      }}>
        {/* Top Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: logoSrc ? 'rgba(255,255,255,0.06)' : 'var(--accent, #6366f1)',
            border: '1px solid rgba(255,255,255,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {logoSrc ? (
              <img src={logoSrc} alt={brandName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
            ) : (
              <Building2 size={20} color="var(--accent-fg, #ffffff)" />
            )}
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              {brandName}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Enterprise Operations
            </div>
          </div>
        </div>

        {/* Center Editorial Statement & Operational Pillars */}
        <div style={{ maxWidth: '480px', margin: '48px 0' }}>
          <div style={{
            display: 'inline-block',
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--accent, #6366f1)',
            marginBottom: '14px'
          }}>
            Internal Staff Workspace
          </div>

          <h1 style={{
            fontSize: 'clamp(1.75rem, 2.8vw, 2.45rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#f8fafc',
            margin: '0 0 18px 0'
          }}>
            Precision billing, biometric telemetry, and financial control.
          </h1>

          <p style={{
            fontSize: '0.92rem',
            lineHeight: 1.6,
            color: '#94a3b8',
            margin: '0 0 36px 0'
          }}>
            Manage enterprise clients, automated quotations, tax invoices, live Cloud Push hardware fleets, and SLFRS ledger accounts from one unified console.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent, #6366f1)', flexShrink: 0 }}>
                <Cloud size={17} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f1f5f9' }}>Cloud Push &amp; Active User Audits</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>Live eTechno gateway sync, device diagnostics, and monthwise active member billing.</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#10b981', flexShrink: 0 }}>
                <Receipt size={17} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f1f5f9' }}>Quotations, Invoices &amp; Client Portal</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>Interactive share links, OTP-verified payment submissions, and PDF receipts.</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f59e0b', flexShrink: 0 }}>
                <Scale size={17} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f1f5f9' }}>SLFRS Double-Entry Ledger</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>Automated receivables, depreciation schedules, trial balance, and 24/7 cron agents.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Metadata */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.75rem',
          color: '#64748b',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '18px'
        }}>
          <span>{PORTAL_INFO.supportLocation}</span>
          <span>{PORTAL_INFO.supportEmail} • {PORTAL_INFO.supportPhone}</span>
        </div>
      </aside>

      {/* RIGHT PANEL: FOCUSED AUTHENTICATION WORKSPACE */}
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: 'var(--bg, #0d1117)'
      }}>
        <div
          className={`login-form-shell${shakeError ? ' shake' : ''}`}
          style={{
            width: '100%',
            maxWidth: '400px'
          }}
        >
          {/* Mobile Brand Header (shown only when left pane collapses) */}
          <div className="login-mobile-brand" style={{ display: 'none', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '9px',
              background: logoSrc ? 'var(--surface-2)' : 'var(--accent, #6366f1)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            }}>
              {logoSrc ? (
                <img src={logoSrc} alt={brandName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '3px' }} />
              ) : (
                <Building2 size={18} color="var(--accent-fg, #ffffff)" />
              )}
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>{brandName}</div>
          </div>

          {/* Left-Aligned Form Title */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--text, #f8fafc)',
              margin: '0 0 6px 0'
            }}>
              {isSignUp ? 'Create staff account' : 'Sign in to workspace'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted, #94a3b8)' }}>
              {isSignUp
                ? `Register your authorized ${brandName} staff credentials.`
                : `Enter your organization email and password to continue.`}
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            background: 'var(--surface, #161a23)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border, rgba(255,255,255,0.12))',
            marginBottom: '22px'
          }}>
            {[
              { label: 'Sign In', su: false },
              { label: 'Register', su: true }
            ].map(({ label, su }) => (
              <button
                key={label}
                type="button"
                onClick={() => { setIsSignUp(su); setError(null); setMessage(null); }}
                style={{
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  background: isSignUp === su ? 'var(--accent, #6366f1)' : 'transparent',
                  color: isSignUp === su ? 'var(--accent-fg, #ffffff)' : 'var(--muted, #94a3b8)'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '11px 13px',
              borderRadius: '10px',
              color: '#f87171',
              fontSize: '0.82rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.45
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {message && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '11px 13px',
              borderRadius: '10px',
              color: '#34d399',
              fontSize: '0.82rem',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isSignUp && (
              <div>
                <label className="form-label" htmlFor="signup-fullname-input" style={{ fontSize: '0.76rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    id="signup-fullname-input"
                    className="form-input"
                    placeholder="e.g. Ruwan Silva"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    disabled={loading}
                    style={{ paddingLeft: '40px', height: '44px' }}
                  />
                </div>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="login-email-input" style={{ fontSize: '0.76rem', fontWeight: 700, margin: 0 }}>
                  Organization Email
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>
                  {PORTAL_INFO.domainHint}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  id="login-email-input"
                  className="form-input"
                  placeholder="name@seynex.lk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  style={{ paddingLeft: '40px', height: '44px' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="login-password-input" style={{ fontSize: '0.76rem', fontWeight: 700, margin: 0 }}>
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--accent, #6366f1)',
                      fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit'
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password-input"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ paddingLeft: '40px', paddingRight: '42px', height: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              className="btn btn-primary"
              disabled={loading}
              style={{
                height: '46px',
                width: '100%',
                marginTop: '6px',
                fontSize: '0.92rem',
                fontWeight: 700
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Verifying Workspace...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? `Create ${PORTAL_INFO.shortName} Account` : `Sign In to ${PORTAL_INFO.shortName}`}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Security Footer */}
          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border, rgba(255,255,255,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.75rem',
            color: 'var(--muted, #94a3b8)'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>256-bit TLS Encrypted Session</span>
            </span>

            {isDemoMode && (
              <button
                type="button"
                id="toggle-demo-credentials-btn"
                onClick={() => setShowDemo(!showDemo)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text)',
                  fontSize: '0.74rem', cursor: 'pointer', fontWeight: 700, padding: 0, textDecoration: 'underline'
                }}
              >
                {showDemo ? 'Hide Demo Logins' : 'Demo Logins'}
              </button>
            )}
          </div>

          {/* Demo Quick-Fill (Only when VITE_ENABLE_DEMO_MODE=true) */}
          {showDemo && isDemoMode && (
            <div style={{
              marginTop: '14px',
              background: 'var(--surface, #161a23)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {PORTAL_INFO.demoAccounts.map(r => {
                const RoleIcon = r.icon;
                const isSelected = email === r.e;
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={e => handleQuickFill(e, r.e, r.p)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      justifyContent: 'space-between',
                      borderColor: isSelected ? 'var(--accent)' : undefined
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <RoleIcon size={13} />
                      <strong>{r.label}</strong>
                      {isSelected && <Check size={13} color="var(--accent)" />}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', opacity: 0.8 }}>{r.e}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          onClick={() => setShowForgotModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(2, 6, 23, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '400px', width: '100%',
              background: 'var(--surface, #161a23)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius, 16px)',
              padding: '24px',
              position: 'relative',
              boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
            }}
          >
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              aria-label="Close modal"
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px'
            }}>
              <KeyRound size={20} />
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
              Password Recovery
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 16px 0' }}>
              To protect financial and client data isolation, staff credentials are reset by your workspace administrator.
            </p>

            <div style={{
              background: 'var(--surface-2, rgba(255,255,255,0.03))',
              border: '1px solid var(--border)',
              padding: '14px', borderRadius: '10px',
              fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.75, marginBottom: '18px'
            }}>
              <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} style={{ color: 'var(--accent)' }} />
                {PORTAL_INFO.supportDepartment}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{PORTAL_INFO.supportLocation}</div>
              <div style={{ marginTop: '6px', fontSize: '0.78rem' }}>
                <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{PORTAL_INFO.supportEmail}</div>
                <div style={{ color: 'var(--muted)' }}>{PORTAL_INFO.supportPhone}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', height: '42px' }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .login-form-shell.shake {
          animation: shake 0.4s ease;
        }
        @media (max-width: 900px) {
          .login-split-root {
            grid-template-columns: 1fr !important;
          }
          .login-brand-pane {
            display: none !important;
          }
          .login-mobile-brand {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
