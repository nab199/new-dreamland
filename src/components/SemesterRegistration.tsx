import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { 
  Calendar, CheckCircle, XCircle, AlertTriangle, Clock, 
  User, FileText, ArrowRight, RefreshCw
} from 'lucide-react';

interface SemesterRegistrationProps {
  onRegistered?: () => void;
}

interface RegistrationStatus {
  registered: boolean;
  status: string | null;
  semester: { id: number; semester_name: string; academic_year: string } | null;
  registrationDate: string | null;
}

export default function SemesterRegistration({ onRegistered }: SemesterRegistrationProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showLateRequest, setShowLateRequest] = useState(false);
  const [lateReason, setLateReason] = useState('');

  useEffect(() => {
    checkRegistrationStatus();
  }, [token]);

  const checkRegistrationStatus = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/semester-registration/status', { headers });
      setStatus(res.data);
    } catch (err) {
      console.error('Failed to check registration status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post('/api/semester-registration/register', {}, { headers });
      
      if (res.data.requiresApproval) {
        showToast('Registration submitted - pending approval from registrar', 'info');
      } else {
        showToast('Successfully registered for the semester!', 'success');
      }
      
      await checkRegistrationStatus();
      if (onRegistered) onRegistered();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Registration failed';
      showToast(errorMsg, 'error');
      
      // If registration period is closed, offer late registration
      if (errorMsg.includes('No active semester') === false) {
        setShowLateRequest(true);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleLateRequest = async () => {
    if (!lateReason.trim()) {
      showToast('Please provide a reason for late registration', 'error');
      return;
    }
    
    setRegistering(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('/api/semester-registration/late-request', { reason: lateReason }, { headers });
      showToast('Late registration request submitted - please wait for approval', 'info');
      setShowLateRequest(false);
      await checkRegistrationStatus();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit request', 'error');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Student is registered and active
  if (status?.registered && status.status === 'registered') {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-emerald-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">You're Registered!</h2>
          <p className="text-stone-600 mb-4">
            You are registered for <span className="font-bold">{status.semester?.semester_name}</span> ({status.semester?.academic_year})
          </p>
          {status.registrationDate && (
            <p className="text-sm text-stone-500">
              Registered on: {new Date(status.registrationDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Student is banned
  if (status?.status === 'banned') {
    return (
      <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="text-red-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Restricted</h2>
          <p className="text-stone-600 mb-6">
            Your access to the system has been restricted. Please visit the <span className="font-bold">Registrar's Office</span> to resolve this issue.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left">
            <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
              <AlertTriangle size={20} />
              Required Action
            </div>
            <p className="text-red-700 text-sm">
              Go to the registrar's office in person with your student ID to resolve the registration issue.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Student has pending approval
  if (status?.status === 'pending_approval') {
    return (
      <div className="bg-white rounded-3xl border border-orange-200 shadow-sm p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="text-orange-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-orange-600 mb-2">Pending Approval</h2>
          <p className="text-stone-600 mb-4">
            Your registration for <span className="font-bold">{status.semester?.semester_name}</span> is pending approval from the registrar.
          </p>
          <p className="text-sm text-stone-500">
            Please check back later or visit the registrar's office if you have questions.
          </p>
        </div>
      </div>
    );
  }

  // Student not registered - show registration options
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="text-blue-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Semester Registration</h2>
          <p className="text-stone-600">
            Register for <span className="font-bold">{status?.semester?.semester_name}</span> ({status?.semester?.academic_year})
          </p>
        </div>

        {!showLateRequest ? (
          <div className="space-y-4">
            <button
              onClick={handleRegister}
              disabled={registering}
              className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {registering ? (
                <>
                  <RefreshCw className="animate-spin" size={24} />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={24} />
                  Register Now
                </>
              )}
            </button>

            <button
              onClick={() => setShowLateRequest(true)}
              className="w-full flex items-center justify-center gap-3 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
            >
              <AlertTriangle size={24} />
              Registration Period Closed?
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h3 className="font-bold text-orange-800 mb-2">Late Registration Request</h3>
              <p className="text-sm text-orange-700">
                The registration period is closed. You can submit a request for manual approval. 
                Please provide a valid reason.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">
                Reason for Late Registration
              </label>
              <textarea
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder="Explain why you are registering late..."
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLateRequest}
                disabled={registering}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                {registering ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                onClick={() => setShowLateRequest(false)}
                className="px-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-stone-100">
          <div className="flex items-center gap-3 text-stone-500 text-sm">
            <User size={16} />
            <span>Need help? Visit the Registrar's Office during working hours.</span>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <FileText className="text-blue-600 mt-0.5" size={20} />
        <div>
          <h4 className="font-bold text-blue-900">How it works</h4>
          <ul className="text-sm text-blue-700 mt-2 space-y-1">
            <li>1. Register during the open registration period</li>
            <li>2. Complete your course registration</li>
            <li>3. Access your marklist and attendance</li>
            <li>4. If missed, request late approval from registrar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}