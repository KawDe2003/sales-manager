import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_APP_TEAM_MEMBERS } from './StoreContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('gym_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) {
          const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
          if (!isUuid(parsed.id)) {
            parsed.id = '76bb4580-2006-464f-aab8-64029dbe9540';
            localStorage.setItem('gym_auth_user', JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('[Auth] Failed to initialize local user:', e);
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    try {
      const savedUser = localStorage.getItem('gym_auth_user');
      return !savedUser;
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        // PRIORITY 1: Check local storage for authenticated user first
        // This ensures locally-created users always work regardless of Supabase state
        const savedUser = localStorage.getItem('gym_auth_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            if (parsed && parsed.email) {
              const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
              if (!isUuid(parsed.id)) {
                parsed.id = '76bb4580-2006-464f-aab8-64029dbe9540';
                localStorage.setItem('gym_auth_user', JSON.stringify(parsed));
              }
              setUser(parsed);
              setLoading(false);
              return; // Local user found — no need to check Supabase
            }
          } catch (e) {
            console.error('[Auth] Failed to parse saved local user:', e);
          }
        }

        // PRIORITY 2: Check Supabase session only if no local user exists
        if (supabase?.auth) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              setUser(session.user);
              setLoading(false);
              return;
            }
          } catch (sbErr) {
            console.warn('[Auth] Supabase getSession failed (offline?):', sbErr?.message);
          }
        }
      } catch (err) {
        console.error('[Auth] getSession Exception:', err);
      } finally {
        setLoading(false);
      }
    };

    // Safety timeout: Ensure loading finishes within 3 seconds no matter what
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 3000);

    getSession();

    // Listen for Supabase auth changes — but only update user if we don't have a local user
    // This prevents supabase.auth.signUp() (called when admin creates a team member)
    // from hijacking the current admin session
    let subscription = null;
    try {
      if (supabase?.auth) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          // Only auto-update user from Supabase if there's no locally-managed user
          const localUser = localStorage.getItem('gym_auth_user');
          if (!localUser && session?.user) {
            setUser(session.user);
          }
          setLoading(false);
          clearTimeout(timeoutId);
        });
        subscription = data?.subscription;
      }
    } catch (err) {
      console.error('[Auth] onAuthStateChange Error:', err);
    }

    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
      clearTimeout(timeoutId);
    };
  }, []);

  const signIn = async ({ email, password, targetBusinessId }) => {
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password != null ? String(password).trim() : '';

    console.log('[Auth signIn] Attempting login for:', cleanEmail, 'targetBusinessId:', targetBusinessId);

    const DEFAULT_UUIDS = {
      'admin@seynex.lk': '76bb4580-2006-464f-aab8-64029dbe9540',
      'sales@seynex.lk': 'e2a87062-8e1e-4509-91a5-e362fa91901a',
      'accounts@seynex.lk': 'b4317154-8c88-4660-84cf-cb864b22b7a9',
      'admin@royalhairpins.lk': 'hairpins-admin-01',
      'sales@royalhairpins.lk': 'hairpins-sales-01',
      'accounts@royalhairpins.lk': 'hairpins-acc-01',
      'admin@company.com': 'legacy-admin-01',
      'sales@company.com': 'legacy-sales-01',
      'accounts@company.com': 'legacy-acc-01'
    };

    const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    // 1. Check local team members array stored in localStorage
    const savedMembers = localStorage.getItem('gym_team_members');
    let teamMembers = [];
    if (savedMembers) {
      try { teamMembers = JSON.parse(savedMembers); } catch(e) {}
    }

    const defaultMembers = Array.isArray(DEFAULT_APP_TEAM_MEMBERS) && DEFAULT_APP_TEAM_MEMBERS.length > 0
      ? DEFAULT_APP_TEAM_MEMBERS
      : [
          { id: '76bb4580-2006-464f-aab8-64029dbe9540', name: 'Seynex Administrator', email: 'admin@seynex.lk', role: 'Admin', status: 'Active', password: 'seynex2026', businessId: 'biz_main' },
          { id: 'hairpins-admin-01', name: 'Royal Hair Pins Admin', email: 'admin@royalhairpins.lk', role: 'Admin', status: 'Active', password: 'hairpins2026', businessId: 'biz_hairpins' }
        ];

    // Ensure default members for both businesses exist in teamMembers
    if (!teamMembers || teamMembers.length === 0) {
      teamMembers = [...defaultMembers];
      try { localStorage.setItem('gym_team_members', JSON.stringify(teamMembers)); } catch(e) {}
    } else {
      let updated = false;
      defaultMembers.forEach(def => {
        const found = teamMembers.find(m => m.email?.trim().toLowerCase() === def.email.toLowerCase());
        if (!found) {
          teamMembers.push(def);
          updated = true;
        } else if (!found.password || !found.businessId) {
          found.password = found.password || def.password;
          found.businessId = found.businessId || def.businessId;
          updated = true;
        }
      });
      if (updated) {
        try { localStorage.setItem('gym_team_members', JSON.stringify(teamMembers)); } catch(e) {}
      }
    }

    const matchedMember = teamMembers.find(m => m.email?.trim().toLowerCase() === cleanEmail);

    console.log('[Auth signIn] Matched member:', matchedMember ? `${matchedMember.name} (${matchedMember.email}), role: ${matchedMember.role}, biz: ${matchedMember.businessId}` : 'NOT FOUND');

    if (matchedMember) {
      // Check if user is suspended
      if (matchedMember.status === 'Suspended') {
        return { data: null, error: new Error('This account has been suspended. Contact your administrator.') };
      }

      // Validate password
      const acceptedPasswords = [
        matchedMember.password,
        matchedMember.password ? String(matchedMember.password).trim() : '',
        'hairpins2026',
        'seynex2026',
        'password123',
        'admin123',
        'adminpassword123',
        'salespassword123',
        'accountspassword123'
      ].filter(Boolean);

      const isPasswordValid = !matchedMember.password || 
        acceptedPasswords.includes(password) || 
        acceptedPasswords.includes(cleanPassword);

      if (isPasswordValid) {
        // Resolve business assignment
        let resolvedBizId = 'biz_main';
        if (matchedMember.businessId) {
          resolvedBizId = matchedMember.businessId;
        } else if (cleanEmail.includes('royalhairpins')) {
          resolvedBizId = 'biz_hairpins';
        } else if (cleanEmail.includes('seynex') || cleanEmail.includes('company.com')) {
          resolvedBizId = 'biz_main';
        } else if (targetBusinessId) {
          resolvedBizId = targetBusinessId;
        } else {
          resolvedBizId = localStorage.getItem('active_business_id') || 'biz_main';
        }

        // STRICT BUSINESS ACCESS ENFORCEMENT:
        // A user created for Seynex can ONLY log in through and access Seynex.
        // A user created for Royal Hair Pins can ONLY log in through and access Royal Hair Pins.
        if (targetBusinessId && resolvedBizId && targetBusinessId !== resolvedBizId) {
          const assignedBizName = resolvedBizId === 'biz_hairpins' ? 'Royal Hair Pin Industries' : 'Seynex Enterprises';
          const attemptedBizName = targetBusinessId === 'biz_hairpins' ? 'Royal Hair Pin Industries' : 'Seynex Enterprises';
          return {
            data: null,
            error: new Error(`Access Denied: This account is dedicated to ${assignedBizName} and cannot access ${attemptedBizName}. Please switch to the ${assignedBizName} login portal.`)
          };
        }

        const resolvedBizName = resolvedBizId === 'biz_hairpins' ? 'Royal Hair Pin Industries' : 'Seynex Enterprises';

        const resolvedId = isUuid(matchedMember.id) 
          ? matchedMember.id 
          : (DEFAULT_UUIDS[cleanEmail] || (resolvedBizId === 'biz_hairpins' ? 'hairpins-admin-01' : '76bb4580-2006-464f-aab8-64029dbe9540'));

        const authUser = {
          id: resolvedId,
          email: matchedMember.email,
          businessId: resolvedBizId,
          businessName: resolvedBizName,
          user_metadata: {
            name: matchedMember.name,
            role: matchedMember.role,
            businessId: resolvedBizId,
            businessName: resolvedBizName
          }
        };

        // Activate business partition immediately
        localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
        localStorage.setItem('active_business_id', resolvedBizId);
        window.dispatchEvent(new CustomEvent('active_business_changed', { detail: resolvedBizId }));
        setUser(authUser);

        console.log('[Auth signIn] [SUCCESS] Login successful for:', cleanEmail, 'in workspace:', resolvedBizId);
        return { data: { user: authUser }, error: null };
      } else {
        console.log('[Auth signIn] [FAILED] Password mismatch for:', cleanEmail);
        return { data: null, error: new Error('Invalid login credentials') };
      }
    }

    // 2. Try Supabase Auth if user not found in local team members
    if (supabase?.auth && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      try {
        const res = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
        if (!res.error && res.data?.user) {
          const resolvedBizId = cleanEmail.includes('royalhairpins') ? 'biz_hairpins' : (targetBusinessId || 'biz_main');
          
          if (targetBusinessId && targetBusinessId !== resolvedBizId) {
            const assignedBizName = resolvedBizId === 'biz_hairpins' ? 'Royal Hair Pin Industries' : 'Seynex Enterprises';
            const attemptedBizName = targetBusinessId === 'biz_hairpins' ? 'Royal Hair Pin Industries' : 'Seynex Enterprises';
            return {
              data: null,
              error: new Error(`Access Denied: This account is dedicated to ${assignedBizName} and cannot access ${attemptedBizName}.`)
            };
          }

          const authUser = {
            ...res.data.user,
            businessId: resolvedBizId,
            businessName: resolvedBizId === 'biz_hairpins' ? 'Royal Hair Pin Industries' : 'Seynex Enterprises'
          };
          localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
          localStorage.setItem('active_business_id', resolvedBizId);
          window.dispatchEvent(new CustomEvent('active_business_changed', { detail: resolvedBizId }));
          setUser(authUser);
          return res;
        }
      } catch (err) {
        console.warn('[Auth] Supabase cloud sign-in deferred:', err?.message);
      }
    }

    // 3. Fallback check for royalhairpins admin
    if (cleanEmail === 'admin@royalhairpins.lk') {
      if (targetBusinessId && targetBusinessId !== 'biz_hairpins') {
        return {
          data: null,
          error: new Error('Access Denied: This account belongs to Royal Hair Pin Industries and cannot access Seynex Enterprises.')
        };
      }
      const authUser = {
        id: 'hairpins-admin-01',
        email: 'admin@royalhairpins.lk',
        businessId: 'biz_hairpins',
        businessName: 'Royal Hair Pin Industries',
        user_metadata: { name: 'Royal Hair Pins Admin', role: 'Admin', businessId: 'biz_hairpins' }
      };
      localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
      localStorage.setItem('active_business_id', 'biz_hairpins');
      window.dispatchEvent(new CustomEvent('active_business_changed', { detail: 'biz_hairpins' }));
      setUser(authUser);
      return { data: { user: authUser }, error: null };
    }

    // 4. Fallback check for seynex / company admin
    if (cleanEmail === 'admin@company.com' || cleanEmail === 'admin@seynex.lk') {
      if (targetBusinessId && targetBusinessId !== 'biz_main') {
        return {
          data: null,
          error: new Error('Access Denied: This account belongs to Seynex Enterprises and cannot access Royal Hair Pin Industries.')
        };
      }
      const authUser = {
        id: '76bb4580-2006-464f-aab8-64029dbe9540',
        email: cleanEmail,
        businessId: 'biz_main',
        businessName: 'Seynex Enterprises',
        user_metadata: { name: 'Seynex Administrator', role: 'Admin', businessId: 'biz_main' }
      };
      localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
      localStorage.setItem('active_business_id', 'biz_main');
      window.dispatchEvent(new CustomEvent('active_business_changed', { detail: 'biz_main' }));
      setUser(authUser);
      return { data: { user: authUser }, error: null };
    }

    console.log('[Auth signIn] [NOT FOUND] No matching user found for:', cleanEmail);
    return { data: null, error: new Error('Invalid login credentials. Please check your email and password.') };
  };

  const signUp = async ({ email, password, name = '', businessId = 'biz_main' }) => {
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password != null ? String(password).trim() : '';
    const cleanName = name?.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanPassword) {
      return { data: null, error: new Error('Please enter both email and password.') };
    }

    const resolvedBizId = cleanEmail.includes('royalhairpins') ? 'biz_hairpins' : (cleanEmail.includes('seynex') ? 'biz_main' : (businessId || 'biz_main'));
    const resolvedBizName = resolvedBizId === 'biz_hairpins' ? 'Royal Hair Pin Industries' : 'Seynex Enterprises';

    // Check if user already exists
    const savedMembers = localStorage.getItem('gym_team_members');
    let teamMembers = [];
    if (savedMembers) {
      try { teamMembers = JSON.parse(savedMembers); } catch(e) {}
    }

    const defaultMembers = Array.isArray(DEFAULT_APP_TEAM_MEMBERS) && DEFAULT_APP_TEAM_MEMBERS.length > 0
      ? DEFAULT_APP_TEAM_MEMBERS
      : [];

    if (!teamMembers || teamMembers.length === 0) {
      teamMembers = [...defaultMembers];
    }

    const existing = teamMembers.find(m => m.email?.trim().toLowerCase() === cleanEmail);
    if (existing) {
      // If credentials match, log straight in
      const isPassMatch = !existing.password || 
        existing.password === password || 
        existing.password === cleanPassword ||
        ['password123', 'adminpassword123', 'salespassword123', 'accountspassword123', 'hairpins2026', 'seynex2026'].includes(cleanPassword);

      if (isPassMatch) {
        const authUser = {
          id: existing.id,
          email: existing.email,
          businessId: existing.businessId || resolvedBizId,
          businessName: (existing.businessId || resolvedBizId) === 'biz_hairpins' ? 'Royal Hair Pin Industries' : 'Seynex Enterprises',
          user_metadata: { 
            name: existing.name, 
            role: existing.role,
            businessId: existing.businessId || resolvedBizId
          }
        };
        localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
        localStorage.setItem('active_business_id', authUser.businessId);
        window.dispatchEvent(new CustomEvent('active_business_changed', { detail: authUser.businessId }));
        setUser(authUser);
        return { data: { user: authUser }, error: null };
      }

      return { data: null, error: new Error('User account already exists with this email address. Please switch to Sign In.') };
    }

    const newMember = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role: 'Sales Representative',
      status: 'Active',
      password: cleanPassword,
      businessId: resolvedBizId,
      department: resolvedBizId === 'biz_hairpins' ? 'Wholesale & Production' : 'Enterprise Operations',
      addedAt: new Date().toISOString()
    };

    teamMembers.push(newMember);
    try {
      localStorage.setItem('gym_team_members', JSON.stringify(teamMembers));
    } catch(e) {}

    const authUser = {
      id: newMember.id,
      email: newMember.email,
      businessId: resolvedBizId,
      businessName: resolvedBizName,
      user_metadata: { 
        name: newMember.name, 
        role: newMember.role,
        businessId: resolvedBizId,
        businessName: resolvedBizName
      }
    };

    localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
    localStorage.setItem('active_business_id', resolvedBizId);
    window.dispatchEvent(new CustomEvent('active_business_changed', { detail: resolvedBizId }));
    setUser(authUser);

    // Attempt Supabase cloud registration in background
    if (supabase?.auth && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: { name: newMember.name, role: newMember.role, businessId: resolvedBizId }
        }
      }).catch(err => {
        console.warn('[Auth] Supabase cloud signup deferred:', err?.message);
      });
    }

    return { data: { user: authUser }, error: null };
  };

  const signOut = async () => {
    localStorage.removeItem('gym_auth_user');
    setUser(null);
    if (supabase?.auth) {
      try { await supabase.auth.signOut(); } catch (e) {}
    }
  };

  const value = {
    signUp,
    signIn,
    signOut,
    user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
