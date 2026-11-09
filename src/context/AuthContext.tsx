
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
  setCurrentUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const localToken = localStorage.getItem('formease_auth_token');
    if (localToken) {
      fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${localToken}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(u => {
          if (u && u.id) {
            setCurrentUser({
              uid: u.id,
              email: u.email,
              displayName: u.fullName || u.username,
              getIdToken: async () => localToken
            } as any);
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    });

    return unsubscribe;
  }, [toast]);

  const value = {
    currentUser,
    loading,
    setCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
