import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, Mail, User, AlertCircle, CheckCircle, 
  ArrowRight, ShieldCheck, Eye, EyeOff, Loader2,
  Sparkles, Check, Building2, KeyRound, Globe, HelpCircle, X
} from 'lucide-react';

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
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleQuickFill = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
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
        setMessage('Account created successfully! Logging you in...');
        setTimeout(() => navigate('/'), 800);
      } else {
        const { error } = await signIn({ email: email.trim(), password });
        if (error) throw error;
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, #0d1527 0%, #070b14 60%, #030712 100%)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)'
    }}>
      
      {/* Dynamic Ambient Background Glows */}
      <div style={{
        position: 'absolute', top: '-15%', left: '10%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
        filter: 'blur(90px)', pointerEvents: 'none', zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute', bottom: '-15%', right: '10%',
        width: '550px', height: '550px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute', top: '40%', right: '-5%',
        width: '350px', height: '350px',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0
      }}></div>

      {/* Main Glassmorphism Authentication Card */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        padding: '40px 36px',
        zIndex: 1,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '58px', height: '58px', borderRadius: '16px', 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <ShieldCheck size={32} color="#ffffff" strokeWidth={2.2} />
          </div>

          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '20px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#34d399', fontSize: '0.72rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px'
          }}>
            <Sparkles size={12} /> Seynex Enterprise Cloud
          </div>

          <h1 style={{ 
            fontSize: '1.85rem', fontWeight: 900, color: '#f8fafc', 
            letterSpacing: '-0.03em', margin: '4px 0 6px 0' 
          }}>
            {isSignUp ? 'Create Staff Profile' : 'Sign in to Workspace'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
            {isSignUp 
              ? 'Register with authorized company credentials' 
              : 'Secure access to quotes, invoices & SLFRS financial ledger'}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div style={{ 
          display: 'flex', 
          background: 'rgba(2, 6, 23, 0.6)', 
          padding: '4px', 
          borderRadius: '12px', 
          border: '1px solid rgba(255, 255, 255, 0.06)',
          marginBottom: '24px' 
        }}>
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); setMessage(null); }}
            style={{
              flex: 1, padding: '8px 12px', border: 'none', borderRadius: '8px',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              background: !isSignUp ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: !isSignUp ? '#ffffff' : '#64748b',
              transition: 'all 0.2s ease',
              boxShadow: !isSignUp ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); setMessage(null); }}
            style={{
              flex: 1, padding: '8px 12px', border: 'none', borderRadius: '8px',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              background: isSignUp ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: isSignUp ? '#ffffff' : '#64748b',
              transition: 'all 0.2s ease',
              boxShadow: isSignUp ? '0 2px 8px rgba(0, 0, 0, 0.2)' : 'none'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '12px 14px',
            borderRadius: '10px',
            color: '#f87171',
            fontSize: '0.82rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            lineHeight: 1.4
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {message && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '12px 14px',
            borderRadius: '10px',
            color: '#34d399',
            fontSize: '0.82rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            lineHeight: 1.4
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="e.g. Priyantha Jayawardena"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  style={{
                    width: '100%', height: '46px', padding: '0 14px 0 42px',
                    background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px', color: '#ffffff', fontSize: '0.9rem', outline: 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: '#64748b' }} />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%', height: '46px', padding: '0 14px 0 42px',
                  background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px', color: '#ffffff', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1' }}>
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: '#64748b' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%', height: '46px', padding: '0 42px 0 42px',
                  background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px', color: '#ffffff', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '14px',
                  background: 'none', border: 'none', color: '#64748b',
                  cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              height: '48px', 
              fontSize: '0.95rem', 
              fontWeight: 800,
              marginTop: '8px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Authenticating Workspace...</span>
              </>
            ) : (
              <>
                <span>{isSignUp ? 'Complete Registration' : 'Sign in to Workspace'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo Roles Quick Fill */}
        <div style={{ 
          marginTop: '22px', 
          padding: '12px 14px', 
          background: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: '12px', 
          border: '1px solid rgba(255, 255, 255, 0.06)' 
        }}>
          <div style={{ 
            fontSize: '0.68rem', fontWeight: 800, color: '#64748b', 
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <KeyRound size={12} color="#10b981" /> 1-Click Role Fill (Testing & Evaluation)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button 
              type="button" 
              onClick={() => handleQuickFill('admin@company.com', 'adminpassword123')}
              style={{ 
                padding: '6px 8px', fontSize: '0.72rem', fontWeight: 700, 
                borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)',
                background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.15s ease'
              }}
            >
              👑 Admin
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickFill('sales@company.com', 'salespassword123')}
              style={{ 
                padding: '6px 8px', fontSize: '0.72rem', fontWeight: 700, 
                borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.25)',
                background: 'rgba(56, 189, 248, 0.08)', color: '#38bdf8', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.15s ease'
              }}
            >
              💼 Sales Rep
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickFill('accounts@company.com', 'accountspassword123')}
              style={{ 
                padding: '6px 8px', fontSize: '0.72rem', fontWeight: 700, 
                borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.25)',
                background: 'rgba(168, 85, 247, 0.08)', color: '#c084fc', cursor: 'pointer',
                textAlign: 'center', transition: 'all 0.15s ease'
              }}
            >
              📊 Accountant
            </button>
          </div>
        </div>

        {/* Security & System Trust Indicators */}
        <div style={{ 
          marginTop: '24px', paddingTop: '16px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.72rem', color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
            <span>256-Bit SSL Enforced</span>
          </div>
          <div>
            <span>Seynex Technology</span>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            maxWidth: '400px', width: '100%', background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '18px',
            padding: '28px', position: 'relative'
          }}>
            <button
              onClick={() => setShowForgotModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <KeyRound size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>Password Recovery</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '20px' }}>
              Password resets are managed by your Seynex System Administrator to ensure enterprise financial access security.
            </p>
            <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '20px' }}>
              <strong>IT Desk Contact:</strong><br />
              Email: <code>seynextech@gmail.com</code><br />
              Hotline: <code>072 840 8880</code>
            </div>
            <button
              onClick={() => setShowForgotModal(false)}
              style={{ width: '100%', height: '40px', background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
