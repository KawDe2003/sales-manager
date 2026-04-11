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
        if (!supabase?.auth) {
          console.error('[Auth] Supabase auth not initialized');
          setLoading(false);
          return;
        }
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('[Auth] Session error:', error);
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('[Auth] getSession Exception:', err);
      } finally {
        setLoading(false);
      }
    };

    // Safety timeout: Ensure loading finishes within 3 seconds no matter what
    const timeoutId = setTimeout(() => {
      console.warn('[Auth] Loading timeout reached - forcing app render');
      setLoading(false);
    }, 3000);

    getSession();

    let subscription = null;
    try {
      if (supabase?.auth) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null);
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

  // Will be passed down to Signup, Login and Logout components
  const value = {
    signUp: (data) => supabase.auth.signUp(data),
    signIn: (data) => supabase.auth.signInWithPassword(data),
    signOut: () => supabase.auth.signOut(),
    user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
