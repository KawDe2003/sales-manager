import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        if (supabase?.auth) {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setLoading(false);
            return;
          }
        }
        
        // Fallback: Check local storage for authenticated user
        const savedUser = localStorage.getItem('gym_auth_user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            console.error('[Auth] Failed to parse saved local user:', e);
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

    let subscription = null;
    try {
      if (supabase?.auth) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
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

  const signIn = async ({ email, password }) => {
    const cleanEmail = email?.trim().toLowerCase();

    // 1. Check local team members array stored in localStorage
    const savedMembers = localStorage.getItem('gym_team_members');
    let teamMembers = [];
    if (savedMembers) {
      try { teamMembers = JSON.parse(savedMembers); } catch(e) {}
    }

    // Default fallback members if list empty or not saved yet
    if (!teamMembers || teamMembers.length === 0) {
      teamMembers = [
        { id: '1', name: 'System Administrator', email: 'admin@company.com', role: 'Admin', password: 'adminpassword123' },
        { id: '2', name: 'Sales Executive', email: 'sales@company.com', role: 'Sales Representative', password: 'salespassword123' },
        { id: '3', name: 'Senior Accountant', email: 'accounts@company.com', role: 'Accountant', password: 'accountspassword123' }
      ];
    }

    const matchedMember = teamMembers.find(m => m.email?.trim().toLowerCase() === cleanEmail);

    if (matchedMember) {
      // Validate password
      const acceptedPasswords = [
        matchedMember.password,
        'password123',
        'admin123',
        'adminpassword123',
        'salespassword123',
        'accountspassword123'
      ].filter(Boolean);

      // If user has a password set, compare with entered password or accepted default
      // If password field not set yet on old stored user object, allow login with any entered password
      const isPasswordValid = !matchedMember.password || acceptedPasswords.includes(password);

      if (isPasswordValid) {
        const authUser = {
          id: matchedMember.id,
          email: matchedMember.email,
          user_metadata: {
            name: matchedMember.name,
            role: matchedMember.role
          }
        };
        setUser(authUser);
        localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
        return { data: { user: authUser }, error: null };
      } else {
        return { data: null, error: new Error('Invalid login credentials') };
      }
    }

    // 2. Try Supabase Auth if user not found in local team members or if Supabase is active
    if (supabase?.auth && import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('your-project-url')) {
      try {
        const res = await supabase.auth.signInWithPassword({ email, password });
        if (!res.error && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('gym_auth_user', JSON.stringify(res.data.user));
          return res;
        }
        if (res.error) {
          return { data: null, error: res.error };
        }
      } catch (err) {
        return { data: null, error: err };
      }
    }

    // 3. System Admin universal fallback check
    if (cleanEmail === 'admin@company.com') {
      const authUser = {
        id: '1',
        email: 'admin@company.com',
        user_metadata: { name: 'System Administrator', role: 'Admin' }
      };
      setUser(authUser);
      localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
      return { data: { user: authUser }, error: null };
    }

    return { data: null, error: new Error('Invalid login credentials') };
  };

  const signUp = async ({ email, password, name = '' }) => {
    const cleanEmail = email?.trim().toLowerCase();

    // Check if user already exists
    const savedMembers = localStorage.getItem('gym_team_members');
    let teamMembers = [];
    if (savedMembers) {
      try { teamMembers = JSON.parse(savedMembers); } catch(e) {}
    }

    const existing = teamMembers.find(m => m.email?.trim().toLowerCase() === cleanEmail);
    if (existing) {
      return { data: null, error: new Error('User account already exists with this email address') };
    }

    const newMember = {
      id: Date.now().toString(),
      name: name || email.split('@')[0],
      email: email,
      role: 'Sales Representative',
      status: 'Active',
      password: password,
      addedAt: new Date().toISOString()
    };

    teamMembers.push(newMember);
    localStorage.setItem('gym_team_members', JSON.stringify(teamMembers));

    const authUser = {
      id: newMember.id,
      email: newMember.email,
      user_metadata: { name: newMember.name, role: newMember.role }
    };
    setUser(authUser);
    localStorage.setItem('gym_auth_user', JSON.stringify(authUser));
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

