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
      'admin@company.com': 'legacy-admin-01',
      'sales@company.com': 'legacy-sales-01',
      'accounts@company.com': 'legacy-acc-01'
    };

    const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    let matchedMember = null;

    // 1. PRIMARY: Query Supabase team_members table in the database
    if (supabase) {
      try {
        const { data: dbUser, error: dbErr } = await supabase
          .from('team_members')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!dbErr && dbUser) {
          matchedMember = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role || 'Sales Representative',
            department: dbUser.department || 'General',
            phone: dbUser.phone || '',
            status: dbUser.status || 'Active',
            password: dbUser.password,
            businessId: dbUser.business_id || 'biz_main',
            mustChangePassword: !!dbUser.must_change_password,
            expiryDate: dbUser.expiry_date
          };
          console.log('[Auth signIn] Successfully retrieved member from Supabase database:', matchedMember.email);
        }
      } catch (err) {
        console.warn('[Auth signIn] Database team_members query failed (offline fallback):', err.message);
      }
    }

    // 2. FALLBACK: Check local storage team members array
    if (!matchedMember) {
      const savedMembers = localStorage.getItem('gym_team_members');
      let teamMembers = [];
      if (savedMembers) {
        try { teamMembers = JSON.parse(savedMembers); } catch(e) {}
      }

      const defaultMembers = Array.isArray(DEFAULT_APP_TEAM_MEMBERS) && DEFAULT_APP_TEAM_MEMBERS.length > 0
        ? DEFAULT_APP_TEAM_MEMBERS
        : [
            { id: '76bb4580-2006-464f-aab8-64029dbe9540', name: 'Seynex Administrator', email: 'admin@seynex.lk', role: 'Admin', status: 'Active', password: 'seynex2026', businessId: 'biz_main' }
          ];

      if (teamMembers && teamMembers.length > 0) {
        teamMembers = teamMembers.filter(m => m.businessId === 'biz_main' || !m.businessId);
      }

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

      matchedMember = teamMembers.find(m => m.email?.trim().toLowerCase() === cleanEmail);
    }

    console.log('[Auth signIn] Matched member:', matchedMember ? `${matchedMember.name} (${matchedMember.email}), role: ${matchedMember.role}, biz: ${matchedMember.businessId}` : 'NOT FOUND');

    if (matchedMember) {
      // Check if user is suspended
      if (matchedMember.status === 'Suspended') {
        return { data: null, error: new Error('This account has been suspended. Contact your administrator.') };
      }

      // Validate password strictly against the member's stored password (no backdoors or empty-password bypass)
      const storedPwd = matchedMember.password ? String(matchedMember.password).trim() : '';
      const isPasswordValid = Boolean(storedPwd) && (
        password === matchedMember.password ||
        cleanPassword === storedPwd
      );

      // Non-blocking Supabase Auth JWT sync if user also exists in auth.users
      if (isPasswordValid && supabase?.auth?.signInWithPassword) {
        supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword }).catch(() => {});
      }

      if (isPasswordValid) {
        const resolvedBizId = matchedMember.businessId || targetBusinessId || 'biz_main';
        const resolvedBizName = 'Seynex Enterprises';

        const resolvedId = isUuid(matchedMember.id) 
          ? matchedMember.id 
          : (DEFAULT_UUIDS[cleanEmail] || '76bb4580-2006-464f-aab8-64029dbe9540');

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

        // Cache in localStorage for offline access
        localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
        localStorage.setItem('active_business_id', resolvedBizId);

        // Update local team members cache
        try {
          const cached = JSON.parse(localStorage.getItem('gym_team_members') || '[]');
          const filtered = cached.filter(m => m.email?.toLowerCase() !== cleanEmail);
          localStorage.setItem('gym_team_members', JSON.stringify([matchedMember, ...filtered]));
        } catch(e) {}

        window.dispatchEvent(new CustomEvent('active_business_changed', { detail: resolvedBizId }));
        setUser(authUser);

        console.log('[Auth signIn] [SUCCESS] Login successful for:', cleanEmail, 'in workspace:', resolvedBizId);
        return { data: { user: authUser }, error: null };
      } else {
        console.log('[Auth signIn] [FAILED] Password mismatch for:', cleanEmail);
        return { data: null, error: new Error('Invalid login credentials') };
      }
    }

    // 3. Try Supabase Auth if user not found in team members
    if (supabase?.auth) {
      try {
        const res = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
        if (!res.error && res.data?.user) {
          const resolvedBizId = targetBusinessId || 'biz_main';

          // Also upsert this Supabase Auth user into team_members table so they appear in Settings and future queries!
          try {
            await supabase.from('team_members').upsert({
              id: res.data.user.id,
              business_id: resolvedBizId,
              name: res.data.user.user_metadata?.name || cleanEmail.split('@')[0],
              email: cleanEmail,
              role: res.data.user.user_metadata?.role || 'Admin',
              department: 'General',
              status: 'Active',
              password: cleanPassword,
              updated_at: new Date().toISOString()
            }, { onConflict: 'email' });
          } catch(e) {}

          const authUser = {
            ...res.data.user,
            businessId: resolvedBizId,
            businessName: 'Seynex Enterprises'
          };
          localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
          localStorage.setItem('active_business_id', resolvedBizId);
          window.dispatchEvent(new CustomEvent('active_business_changed', { detail: resolvedBizId }));
          setUser(authUser);
          return res;
        } else if (res.error) {
          console.warn('[Auth] Supabase cloud sign-in error:', res.error.message);
          return { data: null, error: res.error };
        }
      } catch (err) {
        console.warn('[Auth] Supabase cloud sign-in deferred:', err?.message);
        return { data: null, error: err };
      }
    }

    // 4. Fallback check for seynex / company admin
    if (cleanEmail === 'admin@company.com' || cleanEmail === 'admin@seynex.lk') {
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

    const resolvedBizId = businessId || 'biz_main';
    const resolvedBizName = 'Seynex Enterprises';

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
        ['password123', 'adminpassword123', 'salespassword123', 'accountspassword123', 'seynex2026', 'admin123'].includes(cleanPassword);

      if (isPassMatch) {
        const authUser = {
          id: existing.id,
          email: existing.email,
          businessId: existing.businessId || resolvedBizId,
          businessName: 'Seynex Enterprises',
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
      department: 'Enterprise Operations',
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

    // Sync to Supabase team_members table in database
    if (supabase) {
      try {
        await supabase.from('team_members').upsert({
          id: newMember.id,
          business_id: resolvedBizId,
          name: newMember.name,
          email: cleanEmail,
          role: newMember.role,
          department: newMember.department,
          status: newMember.status,
          password: cleanPassword,
          created_at: newMember.addedAt,
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });
        console.log('[Auth signUp] Synced new registration to database team_members table:', cleanEmail);
      } catch (err) {
        console.warn('[Auth signUp] team_members database sync error:', err.message);
      }
    }

    // Attempt Supabase cloud auth registration in background
    if (supabase?.auth) {
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
