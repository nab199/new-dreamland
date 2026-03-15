import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await axios.post('/api/auth/forgot-password', { email });
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-stone-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-emerald-600 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>

        <div className="bg-white rounded-3xl border border-stone-200 shadow-lg p-8">
          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} className="text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-stone-900 mb-2">
                  Forgot Password?
                </h1>
                <p className="text-stone-600 text-sm">
                  No worries! Enter your email and we'll send you reset instructions.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all disabled:opacity-50"
                    placeholder="your.email@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              {/* Help Text */}
              <p className="mt-6 text-center text-xs text-stone-500">
                Remember your password?{' '}
                <Link to="/login" className="text-emerald-600 font-bold hover:underline">
                  Back to Login
                </Link>
              </p>
            </>
          ) : (
            /* Success Message */
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-3">
                Check Your Email
              </h2>
              <p className="text-stone-600 text-sm mb-6">
                We've sent password reset instructions to:
                <br />
                <span className="font-semibold text-stone-900">{email}</span>
              </p>
              <p className="text-xs text-stone-500 mb-8">
                Didn't receive the email? Check your spam folder or try another email address.
              </p>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                className="text-emerald-600 font-bold text-sm hover:underline"
              >
                Try Another Email
              </button>
            </div>
          )}
        </div>

        {/* Logo */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <Mail size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-stone-900 leading-none">
                DREAMLAND
              </span>
              <span className="text-[8px] font-black tracking-[0.2em] text-emerald-600 uppercase mt-0.5">
                College
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
