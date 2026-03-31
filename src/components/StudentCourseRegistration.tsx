import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { CreditCard, DollarSign, BookOpen, Calculator, Check, X, Upload, AlertCircle, FileText, Key, Loader2, RefreshCw } from 'lucide-react';

interface Course {
  id: number;
  code: string;
  title: string;
  credits: number;
  program?: string;
  price_per_credit?: number;
  prerequisites?: string;
  is_auditable?: number;
}

interface RegisteredCourse extends Course {
  selected: boolean;
  price_per_credit?: number;
}

interface CreditSettings {
  price_per_credit: number;
  min_credits: number;
  max_credits: number;
  late_fee: number;
}

const defaultSettings: CreditSettings = {
  price_per_credit: 500,
  min_credits: 12,
  max_credits: 24,
  late_fee: 1000
};

export default function StudentCourseRegistration() {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<RegisteredCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings] = useState<CreditSettings>(defaultSettings);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'receipt' | 'verify'>('select');
  const [processing, setProcessing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [last8Digits, setLast8Digits] = useState('');
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string; amount?: number } | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [paymentMode, setPaymentMode] = useState<'upload' | 'reference'>('upload');
  const [allowedCourseIds, setAllowedCourseIds] = useState<number[] | null>(null);

  useEffect(() => {
    fetchCourses();
  }, [token]);

  const fetchCourses = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [coursesRes, periodRes] = await Promise.all([
        axios.get('/api/courses/available', { headers }),
        axios.get('/api/registration-periods/current', { headers }).catch(() => ({ data: { period: null } }))
      ]);
      
      let fetchedCourses = coursesRes.data.map((c: any) => ({
        ...c,
        selected: false,
        price_per_credit: c.price_per_credit || 500,
        title: c.title || c.name,
        // The id from /api/courses/available is the course_offering_id
      }));
      
      if (periodRes.data.period?.course_ids) {
        const ids = JSON.parse(periodRes.data.period.course_ids);
        setAllowedCourseIds(ids);
        // If the period restricts specific courses, filter them
        // Note: the IDs in the period might be course_ids, not offering_ids
        fetchedCourses = fetchedCourses.filter((c: any) => ids.includes(c.course_id));
      } else {
        setAllowedCourseIds(null);
      }
      
      setCourses(fetchedCourses);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCourse = (id: number) => {
    setCourses(courses.map(c => {
      if (c.id === id) {
        const newSelected = !c.selected;
        if (newSelected) {
          setSelectedCourses([...selectedCourses, c]);
        } else {
          setSelectedCourses(selectedCourses.filter(sc => sc.id !== id));
        }
        return { ...c, selected: newSelected };
      }
      return c;
    }));
  };

  const totalCredits = selectedCourses.reduce((sum, c) => sum + (c as any).credits, 0);
  const totalAmount = selectedCourses.reduce((sum, c) => sum + ((c as any).credits * ((c as any).price_per_credit || 500)), 0);

  const canRegister = totalCredits >= settings.min_credits && totalCredits <= settings.max_credits;

  const handleStartPayment = () => {
    if (!canRegister) return;
    setShowPaymentModal(true);
    setPaymentStep('select');
    setVerificationResult(null);
    setReceiptFile(null);
    setReceiptPreview(null);
    setTransactionRef('');
    setLast8Digits('');
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setVerificationResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    }
  });

  const handleVerifyReceipt = async () => {
    setProcessing(true);
    setVerificationResult(null);

    try {
      if (paymentMode === 'upload' && receiptFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(receiptFile);
        });

        const response = await axios.post('/api/payments/verify-cbe-receipt', {
          imageBase64: base64,
          expectedAmount: totalAmount
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.verified) {
          setVerificationResult({
            success: true,
            message: 'Payment verified successfully!',
            amount: response.data.amount
          });
          setPaymentStep('verify');
        } else {
          setVerificationResult({
            success: false,
            message: response.data.error || 'Verification failed'
          });
        }
      } else if (paymentMode === 'reference' && transactionRef && last8Digits) {
        const response = await axios.post('/api/payments/verify-cbe', {
          reference: transactionRef,
          last8Digits: last8Digits
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.verified) {
          setVerificationResult({
            success: true,
            message: 'Payment verified successfully!',
            amount: response.data.amount
          });
          setPaymentStep('verify');
        } else {
          setVerificationResult({
            success: false,
            message: response.data.error || 'Verification failed'
          });
        }
      } else {
        setVerificationResult({
          success: false,
          message: 'Please provide receipt or transaction reference'
        });
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        message: err.response?.data?.error || 'Verification failed. Please try again.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteRegistration = async () => {
    setProcessing(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Call enrollment API for each selected course
      // Since the backend only supports single enrollment per call
      for (const course of selectedCourses) {
        await axios.post('/api/enrollments', { 
          course_offering_id: course.id,
          is_audit: false 
        }, { headers });
      }

      showToast('Registration complete! You are now enrolled in ' + selectedCourses.length + ' courses.', 'success');
      setShowPaymentModal(false);
      setSelectedCourses([]);
      setCourses(courses.map(c => ({ ...c, selected: false })));
      
      // Refresh course list to reflect new enrollment state if needed
      fetchCourses();
    } catch (err: any) {
      console.error('Enrollment failed:', err);
      showToast('Enrollment failed: ' + (err.response?.data?.error || 'Unknown error'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setVerificationResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-stone-900">Course Registration</h3>
            <p className="text-sm text-stone-500 mt-1">Select courses and complete payment to register</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-stone-500">Credit Range</p>
              <p className="text-sm font-bold text-stone-700">{settings.min_credits} - {settings.max_credits} credits</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Selected Courses</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{selectedCourses.length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Calculator size={16} className="text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">Total Credits</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{totalCredits}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-emerald-600" />
              <span className="text-xs text-emerald-600 font-medium">Price per Credit</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900">{settings.price_per_credit} ETB</p>
          </div>
          <div className={`p-4 rounded-2xl ${canRegister ? 'bg-orange-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} className={canRegister ? 'text-orange-600' : 'text-red-600'} />
              <span className={`text-xs font-medium ${canRegister ? 'text-orange-600' : 'text-red-600'}`}>Total Amount</span>
            </div>
            <p className={`text-2xl font-bold ${canRegister ? 'text-orange-900' : 'text-red-900'}`}>
              {totalAmount.toLocaleString()} ETB
            </p>
          </div>
        </div>

        {!canRegister && totalCredits > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              <span className="text-red-700 font-medium">
                {totalCredits < settings.min_credits 
                  ? `You need at least ${settings.min_credits} credits. Current: ${totalCredits} credits.`
                  : `Maximum credits exceeded. Current: ${totalCredits}, Max: ${settings.max_credits} credits.`}
              </span>
            </div>
          </div>
        )}

        {allowedCourseIds !== null && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-blue-600" />
              <span className="text-blue-700 font-medium">
                Only {courses.length} courses available for this registration period
              </span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase">
                <th className="px-4 py-3 text-center w-12">Select</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Course Name</th>
                <th className="px-4 py-3 text-left">Program</th>
                <th className="px-4 py-3 text-center">Credits</th>
                <th className="px-4 py-3 text-center">Price/Credit</th>
                <th className="px-4 py-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {courses.map((course) => (
                <tr key={course.id} className={`hover:bg-stone-50 ${course.selected ? 'bg-emerald-50' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleCourse(course.id)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        course.selected 
                          ? 'bg-emerald-600 border-emerald-600' 
                          : 'border-stone-300 hover:border-emerald-500'
                      }`}
                    >
                      {course.selected && <Check size={14} className="text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-stone-700">{course.code}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{course.title || 'N/A'}</td>
                  <td className="px-4 py-3 text-stone-600">{course.program || 'General'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                      {course.credits} CH
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{course.price_per_credit || 500} ETB</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-700">
                    {(course.credits * (course.price_per_credit || 500)).toLocaleString()} ETB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleStartPayment}
            disabled={!canRegister || selectedCourses.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard size={18} />
            Proceed to Payment
          </button>
        </div>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-stone-900">Complete Registration Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-stone-400 hover:text-stone-600">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center gap-2 ${paymentStep === 'select' ? 'text-emerald-600 font-bold' : 'text-stone-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentStep === 'select' ? 'bg-emerald-600 text-white' : 'bg-stone-200'}`}>1</div>
                    <span>Select</span>
                  </div>
                  <div className="flex-1 h-1 bg-stone-200 mx-2">
                    <div className={`h-full ${paymentStep !== 'select' ? 'bg-emerald-600' : ''}`} />
                  </div>
                  <div className={`flex items-center gap-2 ${paymentStep === 'receipt' ? 'text-emerald-600 font-bold' : paymentStep === 'verify' ? 'text-emerald-600 font-bold' : 'text-stone-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentStep === 'receipt' || paymentStep === 'verify' ? 'bg-emerald-600 text-white' : 'bg-stone-200'}`}>2</div>
                    <span>Verify</span>
                  </div>
                  <div className="flex-1 h-1 bg-stone-200 mx-2">
                    <div className={`h-full ${paymentStep === 'verify' ? 'bg-emerald-600' : ''}`} />
                  </div>
                  <div className={`flex items-center gap-2 ${paymentStep === 'verify' ? 'text-emerald-600 font-bold' : 'text-stone-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${paymentStep === 'verify' ? 'bg-emerald-600 text-white' : 'bg-stone-200'}`}>3</div>
                    <span>Complete</span>
                  </div>
                </div>
              </div>

              {paymentStep === 'select' && (
                <div className="space-y-4">
                  <div className="bg-stone-50 p-4 rounded-2xl">
                    <h4 className="font-bold text-stone-900 mb-3">Registration Summary</h4>
                    <div className="space-y-2">
                      {selectedCourses.map(c => (
                        <div key={c.id} className="flex justify-between text-sm">
                          <span className="text-stone-600">{c.code} - {c.title}</span>
                          <span className="font-semibold">{c.credits * (c.price_per_credit || 500)} ETB</span>
                        </div>
                      ))}
                      <div className="border-t border-stone-200 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-bold text-stone-900">Total ({totalCredits} credits)</span>
                          <span className="font-bold text-emerald-700 text-lg">{totalAmount.toLocaleString()} ETB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={20} className="text-blue-600" />
                      <span className="font-bold text-blue-900">Payment Instructions</span>
                    </div>
                    <ol className="text-sm text-blue-800 space-y-1 opacity-80">
                      <li>1. Go to any CBE branch or use CBE mobile banking</li>
                      <li>2. Pay {totalAmount.toLocaleString()} ETB to account: DREAMLAND001</li>
                      <li>3. Get the receipt/transaction reference</li>
                      <li>4. Upload receipt OR enter transaction reference below</li>
                    </ol>
                  </div>

                  <div className="flex gap-2 p-1 bg-stone-100 rounded-xl mb-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('upload')}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${paymentMode === 'upload' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500'}`}
                    >
                      <FileText size={16} className="inline mr-2" />
                      Upload Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('reference')}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${paymentMode === 'reference' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500'}`}
                    >
                      <Key size={16} className="inline mr-2" />
                      Enter Reference
                    </button>
                  </div>

                  {paymentMode === 'upload' && (
                    <div className="space-y-4">
                      <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                          isDragActive ? 'border-emerald-500 bg-emerald-50' : 
                          receiptPreview ? 'border-emerald-300 bg-emerald-50' : 
                          'border-stone-300 hover:border-emerald-400'
                        }`}
                      >
                        <input {...getInputProps()} />
                        {receiptPreview ? (
                          <div className="space-y-4">
                            <img src={receiptPreview} alt="Receipt" className="max-h-48 mx-auto rounded-xl" />
                            <div className="flex items-center justify-center gap-2 text-emerald-600">
                              <Check size={20} />
                              <span className="font-medium">Receipt uploaded: {receiptFile?.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); clearReceipt(); }}
                              className="text-sm text-stone-500 hover:text-red-500"
                            >
                              Remove and upload different file
                            </button>
                          </div>
                        ) : (
                          <div>
                            <Upload size={48} className="text-stone-300 mx-auto mb-4" />
                            <p className="text-stone-600 font-medium">Upload CBE Receipt</p>
                            <p className="text-sm text-stone-400 mt-1">PDF or Image (max 10MB)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentMode === 'reference' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-stone-700">Transaction Reference</label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                          <input
                            type="text"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value.toUpperCase())}
                            placeholder="FT12345678"
                            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-stone-700">Last 8 Digits</label>
                        <input
                          type="text"
                          value={last8Digits}
                          onChange={(e) => setLast8Digits(e.target.value.replace(/\D/g, '').slice(0, 8))}
                          placeholder="12345678"
                          maxLength={8}
                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {verificationResult && (
                    <div className={`p-4 rounded-2xl ${verificationResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-center gap-2">
                        {verificationResult.success ? (
                          <Check className="text-emerald-600" size={20} />
                        ) : (
                          <X className="text-red-600" size={20} />
                        )}
                        <span className={verificationResult.success ? 'text-emerald-700' : 'text-red-700'}>
                          {verificationResult.message}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleVerifyReceipt}
                    disabled={processing || (paymentMode === 'upload' && !receiptFile) || (paymentMode === 'reference' && (!transactionRef || !last8Digits))}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        Verify Payment
                      </>
                    )}
                  </button>
                </div>
              )}

              {paymentStep === 'verify' && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={40} className="text-emerald-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-emerald-700 mb-2">Registration Complete!</h4>
                  <p className="text-stone-600 mb-6">You are now enrolled in {selectedCourses.length} courses for this semester.</p>
                  
                  <div className="bg-stone-50 rounded-2xl p-4 mb-6 text-left">
                    <p className="text-sm text-stone-500 mb-2">Registration Details:</p>
                    <p className="font-semibold">Total: {verificationResult?.amount?.toLocaleString() || totalAmount.toLocaleString()} ETB</p>
                    <p className="font-semibold">Credits: {totalCredits} CH</p>
                    <p className="text-sm text-stone-500">Courses: {selectedCourses.map(c => c.code).join(', ')}</p>
                  </div>

                  <button
                    onClick={handleCompleteRegistration}
                    className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}