import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import StudentRegistration from './pages/StudentRegistration';
import LandingPage from './pages/LandingPage';
import PublicRegistration from './pages/PublicRegistration';
import ProfileSettings from './components/ProfileSettings';
import OfflineIndicator from './components/OfflineIndicator';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './i18n';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user, token } = useAuth();
  const expiry = localStorage.getItem('dreamland_token_expiry');
  const now = Date.now();
  const expiryTime = expiry ? new Date(expiry).getTime() : 0;
  const isExpired = !expiry || expiryTime < now;
  
  console.log('ProtectedRoute - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user?.username, 'token present:', !!token, 'expiry:', expiry, 'isExpired:', isExpired);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/public-registration" element={<PublicRegistration />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register-student"
              element={
                <ProtectedRoute>
                  <StudentRegistration />
                </ProtectedRoute>
              }
            />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          {/* Offline indicator shown on all pages */}
          <OfflineIndicator position="top" showDetails={false} />
          {/* PWA install prompt */}
          <PWAInstallPrompt />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
