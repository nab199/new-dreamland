import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import StudentRegistration from './pages/StudentRegistration';
import PublicRegistration from './pages/PublicRegistration';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProfileSettings from './components/ProfileSettings';
import OfflineIndicator from './components/OfflineIndicator';
import './i18n';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route
              path="/public-registration"
              element={<PublicRegistration />}
            />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          {/* Offline indicator shown on all pages */}
          <OfflineIndicator position="top" showDetails={false} />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
