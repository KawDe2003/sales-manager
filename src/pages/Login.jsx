import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StoreContext } from '../context/StoreContext';
import { 
  Lock, Mail, User, AlertCircle, CheckCircle, ShieldCheck, Eye, EyeOff, 
  Loader2, KeyRound, X, Shield, Briefcase, Calculator, Building2, Sparkles, 
  Factory, Copy, Check, ArrowRight, Share2, Layers, Phone, Building
} from 'lucide-react';

const BUSINESS_PORTALS = {
  biz_main: {
    id: 'biz_main',
    slug: 'seynex',
    name: 'Seynex Enterprises',
    shortName: 'Seynex',
    tagline: 'Enterprise Cloud & Operations Portal',
    subBadge: 'Software Licenses · Cloud Architecture · SLA Contracts',
    color: '#4f46e5',
    colorHover: '#4338ca',
    glowColor: 'rgba(79, 70, 229, 0.28)',
    ambientBg: 'radial-gradient(ellipse at 50% 10%, rgba(79, 70, 229, 0.16), transparent 70%)',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
    icon: Building2,
    domainHint: '@seynex.lk',
    supportDepartment: 'Seynex IT Support & Security Operations',
    supportEmail: 'seynextech@gmail.com',
    supportPhone: '+94 11 234 5678',
    supportLocation: 'Colombo 03 Headquarters, Sri Lanka',
    directUrlParam: 'seynex',
    demoAccounts: [
      { label: 'System Admin', roleBadge: 'Executive', icon: Shield, e: 'admin@seynex.lk', p: 'seynex2026', color: '#818cf8', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)' },
      { label: 'Sales Rep', roleBadge: 'Enterprise Sales', icon: Briefcase, e: 'sales@seynex.lk', p: 'seynex2026', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.08)', border: 'rgba(56, 189, 248, 0.25)' },
      { label: 'Accountant', roleBadge: 'Finance', icon: Calculator, e: 'accounts@seynex.lk', p: 'seynex2026', color: '#c084fc', bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.25)' }
    ]
  },
  biz_hairpins: {
    id: 'biz_hairpins',
    slug: 'hairpins',
    name: 'Royal Hair Pin Industries',
    shortName: 'Royal Hair Pins',
    tagline: 'Manufacturing & Wholesale Operations Portal',
    subBadge: 'Bobby Pins · Display Cards · Factory BOMs · Wholesale',
    color: '#0d9488',
    colorHover: '#0f766e',
    glowColor: 'rgba(13, 148, 136, 0.28)',
    ambientBg: 'radial-gradient(ellipse at 50% 10%, rgba(13, 148, 136, 0.18), transparent 70%)',
    gradient: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
    icon: Sparkles,
    domainHint: '@royalhairpins.lk',
    supportDepartment: 'Plant Office & Production Administration',
    supportEmail: 'royalhairpins@gmail.com',
    supportPhone: '+94 77 123 4567',
    supportLocation: 'Kelaniya Industrial Zone, Sri Lanka',
    directUrlParam: 'hairpins',
    demoAccounts: [
      { label: 'Factory Admin', roleBadge: 'Plant Management', icon: Shield, e: 'admin@royalhairpins.lk', p: 'hairpins2026', color: '#34d399', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)' },
      { label: 'Wholesale Rep', roleBadge: 'Distribution Sales', icon: Briefcase, e: 'sales@royalhairpins.lk', p: 'hairpins2026', color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.08)', border: 'rgba(45, 212, 191, 0.25)' },
      { label: 'Cost Accountant', roleBadge: 'Plant Accounts', icon: Calculator, e: 'accounts@royalhairpins.lk', p: 'hairpins2026', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.08)', border: 'rgba(167, 139, 250, 0.25)' }
    ]
  }
};

const Login = () => {
  const [searchParams] = useSearchParams();
  const { businessSlug } = useParams();
  const { switchBusiness } = useContext(StoreContext) || {};
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Detect initial business from URL search param (?biz=hairpins), path slug (/login/hairpins), or localStorage
  const detectInitialBusiness = () => {
    const urlBiz = (searchParams.get('biz') || businessSlug || '').toLowerCase();
    if (urlBiz === 'hairpins' || urlBiz === 'hairpin' || urlBiz === 'royalhairpins') {
      return 'biz_hairpins';
    }
    if (urlBiz === 'seynex' || urlBiz === 'main') {
      return 'biz_main';
    }
    try {
      const saved = localStorage.getItem('active_business_id');
      if (saved === 'biz_hairpins' || saved === 'biz_main') return saved;
    } catch (e) {}
    return 'biz_main';
  };

  const [selectedBizId, setSelectedBizId] = useState(detectInitialBusiness);
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
  const [successAnim, setSuccessAnim] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [switchNotice, setSwitchNotice] = useState(null);

  const activePortal = BUSINESS_PORTALS[selectedBizId] || BUSINESS_PORTALS.biz_main;
  const PortalIcon = activePortal.icon;

  // Sync with URL when business changes
  const handleSelectBusiness = (bizId) => {
    setSelectedBizId(bizId);
    setError(null);
    setMessage(null);
    const targetSlug = BUSINESS_PORTALS[bizId]?.directUrlParam || 'seynex';
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('biz', targetSlug);
      window.history.replaceState(null, '', url.pathname + url.search);
      localStorage.setItem('active_business_id', bizId);
    } catch (e) {}

    // Preload switch in StoreContext in background
    if (switchBusiness) {
      try { switchBusiness(bizId); } catch (e) {}
    }
  };

  // Smart domain detection as the user enters their email
  const handleEmailChange = (val) => {
    setEmail(val);
    const lower = val.toLowerCase().trim();
    if (lower.includes('@royalhairpins') && selectedBizId !== 'biz_hairpins') {
      setSelectedBizId('biz_hairpins');
      handleSelectBusiness('biz_hairpins');
      setSwitchNotice('Detected Royal Hair Pins account — switched portal to Royal Hair Pins workspace');
      setTimeout(() => setSwitchNotice(null), 4000);
    } else if ((lower.includes('@seynex') || lower.includes('@company.com')) && selectedBizId !== 'biz_main') {
      setSelectedBizId('biz_main');
      handleSelectBusiness('biz_main');
      setSwitchNotice('Detected Seynex account — switched portal to Seynex Enterprises workspace');
      setTimeout(() => setSwitchNotice(null), 4000);
    }
  };

  const handleQuickFill = (e, roleEmail, rolePass) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  const handleCopyDirectLink = () => {
    const directUrl = `${window.location.origin}/login?biz=${activePortal.directUrlParam}`;
    navigator.clipboard.writeText(directUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    setShakeError(false);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        throw new Error('Please enter your email address');
      }
      if (!password) {
        throw new Error('Please enter your password');
      }

      // Determine final target business from credentials or active selection
      let targetBizId = selectedBizId;
      if (cleanEmail.includes('royalhairpins')) {
        targetBizId = 'biz_hairpins';
      } else if (cleanEmail.includes('seynex') || cleanEmail.includes('company.com')) {
        targetBizId = 'biz_main';
      }

      // Activate business workspace immediately
      if (switchBusiness) {
        try { switchBusiness(targetBizId); } catch (e) {}
      }
      localStorage.setItem('active_business_id', targetBizId);
      window.dispatchEvent(new CustomEvent('active_business_changed', { detail: targetBizId }));

      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your full name');
        const { error } = await signUp({ 
          email: cleanEmail, 
          password, 
          name: name.trim(),
          businessId: targetBizId 
        });
        if (error) throw error;
        setSuccessAnim(true);
        setMessage(`Account created for ${BUSINESS_PORTALS[targetBizId].name}! Logging you in...`);
        setTimeout(() => {
          window.location.href = '/';
        }, 450);
      } else {
        const { error } = await signIn({ 
          email: cleanEmail, 
          password,
          targetBusinessId: targetBizId
        });
        if (error) throw error;
        setSuccessAnim(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 450);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
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
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
    fontFamily: 'inherit',
  });

  const onFocus = (e) => {
    e.target.style.borderColor = activePortal.color;
    e.target.style.boxShadow = `0 0 0 3px ${activePortal.glowColor}`;
    e.target.style.background = 'rgba(255,255,255,0.07)';
  };
  const onBlur = (e) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
    e.target.style.boxShadow = 'none';
    e.target.style.background = 'rgba(255,255,255,0.04)';
  };

  return (
    <>
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#070b14',
      backgroundImage: `${activePortal.ambientBg}, radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.02), transparent 50%)`,
      padding: '28px 16px',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background-image 0.4s ease'
    }}>

      {/* Decorative ambient particle glow */}
      <div style={{
        position: 'absolute',
        top: '15%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: activePortal.glowColor,
        filter: 'blur(120px)',
        opacity: 0.35,
        pointerEvents: 'none',
        transition: 'background 0.4s ease'
      }} />

      {/* Main Container Card */}
      <div
        className={`login-card${successAnim ? ' success' : ''}${shakeError ? ' shake' : ''}`}
        style={{
          width: '100%',
          maxWidth: '430px',
          background: 'rgba(13, 19, 33, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: '22px',
          overflow: 'hidden',
          boxShadow: `0 30px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px ${activePortal.glowColor}`,
          position: 'relative',
          zIndex: 10,
          transition: 'box-shadow 0.35s ease, border-color 0.35s ease'
        }}>

        {/* Business Workspace Switcher Tabs */}
        <div style={{
          padding: '16px 18px 0',
          background: 'rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Layers size={13} style={{ color: activePortal.color }} />
              Select Business Workspace
            </span>
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 600,
              color: '#64748b'
            }}>
              Separate Portals
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            paddingBottom: '14px'
          }}>
            {/* Seynex Enterprises Tab */}
            <button
              type="button"
              id="select-seynex-portal-btn"
              onClick={() => handleSelectBusiness('biz_main')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '11px',
                border: selectedBizId === 'biz_main' 
                  ? '1px solid #6366f1' 
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: selectedBizId === 'biz_main'
                  ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.25) 0%, rgba(99, 102, 241, 0.12) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: selectedBizId === 'biz_main' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: selectedBizId === 'biz_main' ? 'linear-gradient(135deg, #4f46e5, #3b82f6)' : 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Building2 size={16} color={selectedBizId === 'biz_main' ? '#fff' : '#94a3b8'} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  Seynex
                </div>
                <div style={{ fontSize: '0.64rem', color: selectedBizId === 'biz_main' ? '#c7d2fe' : '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  Enterprise Portal
                </div>
              </div>
            </button>

            {/* Royal Hair Pins Tab */}
            <button
              type="button"
              id="select-hairpins-portal-btn"
              onClick={() => handleSelectBusiness('biz_hairpins')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '11px',
                border: selectedBizId === 'biz_hairpins' 
                  ? '1px solid #14b8a6' 
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: selectedBizId === 'biz_hairpins'
                  ? 'linear-gradient(135deg, rgba(13, 148, 136, 0.28) 0%, rgba(20, 184, 166, 0.12) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: selectedBizId === 'biz_hairpins' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: selectedBizId === 'biz_hairpins' ? 'linear-gradient(135deg, #0d9488, #10b981)' : 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Sparkles size={16} color={selectedBizId === 'biz_hairpins' ? '#fff' : '#94a3b8'} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  Royal Hair Pins
                </div>
                <div style={{ fontSize: '0.64rem', color: selectedBizId === 'biz_hairpins' ? '#99f6e4' : '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  Factory & Wholesale
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Card Header */}
        <div style={{
          padding: '24px 28px 20px',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Logo Badge */}
          <div className="login-logo" style={{
            width: '56px', height: '56px',
            borderRadius: '16px',
            background: activePortal.gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: `0 10px 25px ${activePortal.glowColor}`,
            transition: 'background 0.35s ease, box-shadow 0.35s ease'
          }}>
            <PortalIcon size={30} color="#fff" strokeWidth={2.2} />
          </div>

          <div style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#f8fafc',
            letterSpacing: '-0.02em',
            marginBottom: '4px',
            transition: 'all 0.2s'
          }}>
            {activePortal.name}
          </div>

          <div style={{
            fontSize: '0.78rem',
            color: '#94a3b8',
            fontWeight: 500,
            marginBottom: '8px'
          }}>
            {activePortal.tagline}
          </div>

          {/* Business Category Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${activePortal.glowColor}`,
            fontSize: '0.68rem',
            color: '#cbd5e1',
            fontWeight: 600,
            marginTop: '2px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: activePortal.color }}></span>
            <span>{activePortal.subBadge}</span>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div style={{ padding: '0 28px' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.3)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {[{ label: 'Sign In', su: false }, { label: 'Register Account', su: true }].map(({ label, su }) => (
              <button key={label} type="button"
                onClick={() => { setIsSignUp(su); setError(null); setMessage(null); }}
                style={{
                  flex: 1, padding: '8px 10px', border: 'none', borderRadius: '8px',
                  fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  background: isSignUp === su ? activePortal.color : 'transparent',
                  color: isSignUp === su ? '#ffffff' : '#64748b',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                  boxShadow: isSignUp === su ? `0 4px 12px ${activePortal.glowColor}` : 'none'
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '18px 28px 24px' }}>

          {/* Switch Notice Banner */}
          {switchNotice && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '10px 12px',
              borderRadius: '9px',
              color: '#38bdf8',
              fontSize: '0.76rem',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: 1.4,
              animation: 'badgeFade 0.25s ease'
            }}>
              <CheckCircle size={14} style={{ flexShrink: 0 }} />
              <span>{switchNotice}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.09)',
              border: '1px solid rgba(239,68,68,0.25)',
              padding: '10px 12px',
              borderRadius: '9px',
              color: '#f87171',
              fontSize: '0.79rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.5,
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div style={{
              background: 'rgba(16,185,129,0.09)',
              border: '1px solid rgba(16,185,129,0.25)',
              padding: '10px 12px',
              borderRadius: '9px',
              color: '#34d399',
              fontSize: '0.79rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <CheckCircle size={15} />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Name field (Register only) */}
            {isSignUp && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.04em' }}>
                  FULL NAME
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '13px', top: '15px', color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    id="signup-fullname-input"
                    placeholder="e.g. Ruwan Silva"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    disabled={loading}
                    style={fieldStyle()}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
                  ORGANIZATION EMAIL
                </label>
                <span style={{ fontSize: '0.68rem', color: activePortal.color, fontWeight: 600 }}>
                  {activePortal.domainHint}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '13px', top: '15px', color: '#64748b', pointerEvents: 'none' }} />
                <input
                  type="email"
                  id="login-email-input"
                  placeholder={selectedBizId === 'biz_hairpins' ? 'admin@royalhairpins.lk' : 'admin@seynex.lk'}
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  required
                  disabled={loading}
                  style={fieldStyle()}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
                  PASSWORD
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    style={{
                      background: 'none', border: 'none', color: activePortal.color,
                      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit'
                    }}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '13px', top: '15px', color: '#64748b', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={fieldStyle()}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '14px',
                    background: 'none', border: 'none', color: '#64748b',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0,
                  }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              style={{
                height: '46px',
                width: '100%',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: loading ? `${activePortal.color}bb` : activePortal.gradient,
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s ease',
                fontFamily: 'inherit',
                letterSpacing: '0.01em',
                boxShadow: `0 8px 20px ${activePortal.glowColor}`,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `0 12px 24px ${activePortal.glowColor}`;
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 8px 20px ${activePortal.glowColor}`;
                }
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Verifying & Syncing Workspace...</span>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{isSignUp ? `Register for ${activePortal.shortName}` : `Sign In to ${activePortal.shortName}`}</span>
                  <ArrowRight size={16} />
                </div>
              )}
            </button>

          </form>

          {/* Shareable Direct Portal Link */}
          <div style={{
            marginTop: '16px',
            padding: '10px 12px',
            borderRadius: '9px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#64748b'
          }}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#94a3b8' }}>Direct URL: </span>
              <code style={{ color: activePortal.color, fontFamily: 'monospace' }}>/login?biz={activePortal.directUrlParam}</code>
            </div>
            <button
              type="button"
              onClick={handleCopyDirectLink}
              title="Copy direct portal URL for this business"
              style={{
                background: 'none',
                border: 'none',
                color: copiedLink ? '#34d399' : '#94a3b8',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '5px'
              }}>
              {copiedLink ? (
                <><Check size={13} color="#34d399" /> Copied</>
              ) : (
                <><Copy size={13} /> Copy Link</>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* SSL Encryption & Demo Toggle Bar */}
      <div style={{
        marginTop: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.72rem',
        color: '#64748b',
        fontWeight: 500,
        zIndex: 10
      }}>
        <ShieldCheck size={14} color="#10b981" />
        <span>Enterprise 256-bit TLS Encrypted</span>
        <span style={{ color: '#334155' }}>·</span>
        <button
          type="button"
          id="toggle-demo-credentials-btn"
          onClick={() => setShowDemo(!showDemo)}
          style={{
            background: 'none',
            border: 'none',
            color: '#cbd5e1',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: 600,
            padding: 0,
            fontFamily: 'inherit',
            textDecoration: 'underline'
          }}>
          {showDemo ? 'Hide Demo Logins' : `Show ${activePortal.shortName} Demo Logins`}
        </button>
      </div>

      {/* Demo Quick-Fill Credentials Card */}
      {showDemo && (
        <div style={{
          marginTop: '12px',
          width: '100%',
          maxWidth: '430px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: `1px solid ${activePortal.glowColor}`,
          borderRadius: '14px',
          padding: '14px 16px',
          zIndex: 10,
          animation: 'cardUp 0.25s ease'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <div style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              Demo Logins for {activePortal.name}
            </div>
            <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Click to autofill</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activePortal.demoAccounts.map(r => {
              const RoleIcon = r.icon;
              const isSelected = email === r.e;
              const btnId = `demo-btn-${r.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
              return (
                <button
                  key={r.label}
                  id={btnId}
                  type="button"
                  onClick={e => handleQuickFill(e, r.e, r.p)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: isSelected ? `2px solid ${activePortal.color}` : `1px solid ${r.border}`,
                    background: isSelected ? activePortal.glowColor : r.bg,
                    color: isSelected ? '#ffffff' : r.color,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 0 12px ${activePortal.glowColor}` : 'none'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RoleIcon size={14} />
                    <span style={{ fontWeight: 800 }}>{r.label}</span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', opacity: 0.85 }}>({r.roleBadge})</span>
                    {isSelected && <Check size={13} style={{ color: activePortal.color, strokeWidth: 3 }} />}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', opacity: isSelected ? 1 : 0.8 }}>
                    {r.e}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(2, 6, 23, 0.88)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            maxWidth: '380px', width: '100%',
            background: '#0f172a',
            border: `1px solid ${activePortal.glowColor}`,
            borderRadius: '18px', padding: '26px', position: 'relative',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}>
            <button
              onClick={() => setShowForgotModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={18} />
            </button>

            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: activePortal.glowColor, color: activePortal.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px',
            }}>
              <KeyRound size={22} color={activePortal.color} />
            </div>

            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
              Password Recovery
            </div>
            <div style={{ fontSize: '0.8rem', color: activePortal.color, fontWeight: 700, marginBottom: '8px' }}>
              {activePortal.name}
            </div>
            <p style={{ fontSize: '0.81rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '16px' }}>
              To ensure data isolation and compliance between business workspaces, password credentials must be reset via your designated administrator.
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              padding: '14px', borderRadius: '10px',
              fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.8, marginBottom: '18px',
            }}>
              <div style={{ fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} style={{ color: activePortal.color }} />
                {activePortal.supportDepartment}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{activePortal.supportLocation}</div>
              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: activePortal.color }}>✉ {activePortal.supportEmail}</span>
                <span style={{ color: '#94a3b8' }}>☎ {activePortal.supportPhone}</span>
              </div>
            </div>

            <button
              onClick={() => setShowForgotModal(false)}
              style={{
                width: '100%', height: '42px',
                background: activePortal.gradient,
                color: '#ffffff', border: 'none',
                borderRadius: '9px', fontWeight: 700, cursor: 'pointer',
                fontSize: '0.88rem', fontFamily: 'inherit',
              }}>
              Back to Sign In
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes cardUp {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes logoPop {
          0%   { transform: scale(0.7); opacity: 0; }
          70%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes successGlow {
          0%   { box-shadow: 0 24px 48px rgba(0,0,0,0.5); }
          50%  { box-shadow: 0 0 0 4px rgba(16,185,129,0.35), 0 24px 48px rgba(16,185,129,0.2); border-color: #10b981; }
          100% { box-shadow: 0 24px 48px rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.08); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
        @keyframes badgeFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: #475569; }
        .login-card {
          animation: cardUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .login-card.success {
          animation: successGlow 0.5s ease forwards;
        }
        .login-card.shake {
          animation: shake 0.4s ease;
        }
        .login-logo {
          animation: logoPop 0.35s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
        }
      `}</style>

    </div>
    </>
  );
};

export default Login;
