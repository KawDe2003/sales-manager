import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, AlertCircle, CheckCircle, ShieldCheck, Eye, EyeOff, Loader2, KeyRound, X, Shield, Briefcase, Calculator } from 'lucide-react';

const Login = () => {
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

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleQuickFill = (e, roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
    setShowDemo(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your full name');
        const { error } = await signUp({ email: email.trim(), password, name: name.trim() });
        if (error) throw error;
        setMessage('Account created! Signing you in...');
        setTimeout(() => navigate('/'), 800);
      } else {
        const { error } = await signIn({ email: email.trim(), password });
        if (error) throw error;
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (hasLeftIcon = true) => ({
    width: '100%',
    height: '46px',
    padding: hasLeftIcon ? '0 44px 0 42px' : '0 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    fontFamily: 'inherit',
  });

  const onFocus = (e) => {
    e.target.style.borderColor = '#10b981';
    e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.13)';
  };
  const onBlur = (e) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#080e1d',
      padding: '20px 16px',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '380px',
        background: 'rgba(15,22,40,0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
      }}>

        {/* Card Header */}
        <div style={{
          padding: '32px 28px 24px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Logo Icon */}
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
          }}>
            <ShieldCheck size={28} color="#fff" strokeWidth={2.3} />
          </div>

          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Seynex
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
            Enterprise Management Portal
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ padding: '16px 28px 0' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            padding: '3px',
            borderRadius: '9px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            {[{ label: 'Sign In', su: false }, { label: 'Register', su: true }].map(({ label, su }) => (
              <button key={label} type="button"
                onClick={() => { setIsSignUp(su); setError(null); setMessage(null); }}
                style={{
                  flex: 1, padding: '7px 10px', border: 'none', borderRadius: '6px',
                  fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  background: isSignUp === su ? 'rgba(255,255,255,0.09)' : 'transparent',
                  color: isSignUp === su ? '#f1f5f9' : '#475569',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '20px 28px 28px' }}>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              padding: '10px 12px', borderRadius: '8px', color: '#f87171',
              fontSize: '0.79rem', marginBottom: '16px',
              display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.5,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {message && (
            <div style={{
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              padding: '10px 12px', borderRadius: '8px', color: '#34d399',
              fontSize: '0.79rem', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <CheckCircle size={15} />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Name field (sign up only) */}
            {isSignUp && (
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.02em' }}>
                  FULL NAME
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '13px', top: '15px', color: '#475569', pointerEvents: 'none' }} />
                  <input type="text" placeholder="Your full name"
                    value={name} onChange={e => setName(e.target.value)}
                    required disabled={loading}
                    style={fieldStyle()}
                    onFocus={onFocus} onBlur={onBlur}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.02em' }}>
                WORK EMAIL
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '13px', top: '15px', color: '#475569', pointerEvents: 'none' }} />
                <input type="email" placeholder="name@company.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required disabled={loading}
                  style={fieldStyle()}
                  onFocus={onFocus} onBlur={onBlur}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.02em' }}>
                  PASSWORD
                </label>
                {!isSignUp && (
                  <button type="button" onClick={() => setShowForgotModal(true)}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '13px', top: '15px', color: '#475569', pointerEvents: 'none' }} />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required disabled={loading}
                  style={fieldStyle()}
                  onFocus={onFocus} onBlur={onBlur}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '14px',
                    background: 'none', border: 'none', color: '#475569',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0,
                  }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              height: '46px', width: '100%', marginTop: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: loading ? '#059669aa' : '#10b981',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '0.9rem', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              fontFamily: 'inherit',
              letterSpacing: '0.01em',
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#059669'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#10b981'; }}
            >
              {loading ? (
                <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /><span>Verifying...</span></>
              ) : (
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>

          </form>
        </div>
      </div>

      {/* SSL Badge */}
      <div style={{
        marginTop: '20px',
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.7rem', color: '#334155', fontWeight: 500,
      }}>
        <ShieldCheck size={13} color="#1e3a2f" />
        <span>256-bit SSL encrypted</span>
        <span style={{ color: '#1e2a1e', margin: '0 4px' }}>·</span>
        <button type="button" onClick={() => setShowDemo(!showDemo)}
          style={{ background: 'none', border: 'none', color: '#334155', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
          {showDemo ? 'Hide demo' : 'Demo login'}
        </button>
      </div>

      {/* Demo quick-fill — collapsed */}
      {showDemo && (
        <div style={{
          marginTop: '12px',
          width: '100%', maxWidth: '380px',
          background: 'rgba(15,22,40,0.95)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
          padding: '14px 16px',
        }}>
          <div style={{ fontSize: '0.67rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Demo Credentials
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Admin', icon: <Shield size={11} />, e: 'admin@company.com', p: 'adminpassword123', color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
              { label: 'Sales Rep', icon: <Briefcase size={11} />, e: 'sales@company.com', p: 'salespassword123', color: '#38bdf8', bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.2)' },
              { label: 'Accountant', icon: <Calculator size={11} />, e: 'accounts@company.com', p: 'accountspassword123', color: '#c084fc', bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.2)' },
            ].map(r => (
              <button key={r.label} type="button"
                onClick={e => handleQuickFill(e, r.e, r.p)}
                style={{
                  padding: '5px 12px', fontSize: '0.72rem', fontWeight: 700,
                  borderRadius: '8px', border: `1px solid ${r.border}`,
                  background: r.bg, color: r.color, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontFamily: 'inherit',
                }}>
                {r.icon}{r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            maxWidth: '340px', width: '100%',
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '24px', position: 'relative',
          }}>
            <button onClick={() => setShowForgotModal(false)}
              style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
              <X size={18} />
            </button>

            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px',
            }}>
              <KeyRound size={20} />
            </div>

            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '6px' }}>
              Password Recovery
            </div>
            <p style={{ fontSize: '0.81rem', color: '#64748b', lineHeight: 1.6, marginBottom: '16px' }}>
              Password resets are managed by your System Administrator to maintain enterprise access security.
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              padding: '12px 14px', borderRadius: '8px',
              fontSize: '0.79rem', color: '#94a3b8', lineHeight: 1.8, marginBottom: '16px',
            }}>
              <strong style={{ color: '#cbd5e1' }}>IT Support</strong><br />
              seynextech@gmail.com<br />
              072 840 8880
            </div>

            <button onClick={() => setShowForgotModal(false)}
              style={{
                width: '100%', height: '40px',
                background: 'rgba(255,255,255,0.07)',
                color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
                fontSize: '0.85rem', fontFamily: 'inherit',
              }}>
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #334155; }
      `}</style>
    </div>
  );
};

export default Login;
