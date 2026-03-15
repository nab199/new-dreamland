import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  role: string;
  full_name: string;
  branch_id?: number;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User, rememberMe?: boolean) => void;
  logout: (reason?: 'user_initiated' | 'session_expired' | 'unauthorized') => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateProfile: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'dreamland_token';
const USER_KEY = 'dreamland_user';
const REFRESH_TOKEN_KEY = 'dreamland_refresh_token';
const TOKEN_EXPIRY_KEY = 'dreamland_token_expiry';

// Check if token is expired
const isTokenExpired = (expiry: string | null): boolean => {
  if (!expiry) return true;
  return new Date(expiry).getTime() < Date.now();
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

        if (savedToken && savedUser && !isTokenExpired(expiry)) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          // Set default axios header
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        } else {
          // Clear invalid data
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(TOKEN_EXPIRY_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      } catch (e) {
        console.error('Auth initialization failed:', e);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Auto-refresh token before expiry (5 minutes buffer)
  useEffect(() => {
    if (!token) return;

    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiry) return;

    const expiryTime = new Date(expiry).getTime();
    const refreshTime = expiryTime - (5 * 60 * 1000); // 5 minutes before expiry
    const now = Date.now();

    if (refreshTime > now) {
      const timeoutId = setTimeout(() => {
        refreshToken();
      }, refreshTime - now);

      return () => clearTimeout(timeoutId);
    }
  }, [token]);

  const login = useCallback((newToken: string, newUser: User, rememberMe: boolean = true) => {
    try {
      setToken(newToken);
      setUser(newUser);
      
      if (rememberMe) {
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        
        // Calculate token expiry (8 hours from now, matching server setting)
        const expiryTime = new Date(Date.now() + (8 * 60 * 60 * 1000)).toISOString();
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime);
      }

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      console.log('Login successful:', newUser.username);
    } catch (e) {
      console.error('Login storage failed:', e);
      throw e;
    }
  }, []);

  const logout = useCallback(async (reason: 'user_initiated' | 'session_expired' | 'unauthorized' = 'user_initiated') => {
    try {
      // Optionally notify server about logout
      const currentToken = localStorage.getItem(TOKEN_KEY);
      if (currentToken) {
        await axios.post('/api/auth/logout', { reason }, {
          headers: { Authorization: `Bearer ${currentToken}` },
          validateStatus: () => true // Don't throw on error
        }).catch(() => {}); // Silently fail
      }
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      delete axios.defaults.headers.common['Authorization'];
      
      console.log('Logout successful:', reason);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        await logout('session_expired');
        return false;
      }

      const response = await axios.post('/api/auth/refresh', { refreshToken });
      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      
      const expiryTime = new Date(Date.now() + (8 * 60 * 60 * 1000)).toISOString();
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      console.log('Token refreshed successfully');
      return true;
    } catch (e) {
      console.error('Token refresh failed:', e);
      await logout('session_expired');
      return false;
    }
  }, [logout]);

  const updateProfile = useCallback((userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    refreshToken,
    isAuthenticated: !!token && !isTokenExpired(localStorage.getItem(TOKEN_EXPIRY_KEY)),
    isLoading,
    updateProfile,
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
  if (context.isLoading) {
    // Return a loading state instead of throwing
    return { ...context, isAuthenticated: false };
  }
  return context;
};

export default AuthContext;
