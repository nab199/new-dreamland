import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { notificationService } from '../services/apiServices';
import { 
  Upload, 
  Camera, 
  Image, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText, 
  DollarSign,
  Smartphone
} from 'lucide-react';

interface CBEReceiptUploadProps {
  expectedAmount?: number;
  onVerificationComplete?: (result: any) => void;
}

export default function CBEReceiptUpload({ expectedAmount, onVerificationComplete }: CBEReceiptUploadProps) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select an image (JPEG, PNG) or PDF file', 'error');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be less than 10MB', 'error');
      return;
    }

    setSelectedFile(file);
    setVerificationResult(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleVerify = async () => {
    if (!selectedFile || !previewUrl) return;

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const base64 = previewUrl.split(',')[1];
      const mimeType = selectedFile.type;

      const response = await axios.post(
        '/api/payments/verify-cbe-receipt',
        {
          imageBase64: base64,
          expectedAmount: expectedAmount
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.verified) {
        setVerificationResult({
          success: true,
          ...response.data
        });
        showToast('Payment verified successfully!', 'success');
        onVerificationComplete?.(response.data);
        
        // Notify Accountants
        try {
          await notificationService.sendNotification({
            role: 'accountant',
            title: 'New Payment Verified',
            message: `A payment of ${response.data.amount} ETB has been verified (Ref: ${response.data.reference}).`
          });
        } catch (notifyErr) {
          console.error('Failed to send notification', notifyErr);
        }
      } else {
        setVerificationResult({
          success: false,
          error: response.data.error || 'Verification failed'
        });
        showToast(response.data.error || 'Verification failed', 'error');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to verify receipt';
      setVerificationResult({
        success: false,
        error: errorMsg
      });
      showToast(errorMsg, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setVerificationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUseCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <FileText className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">CBE Payment Verification</h2>
              <p className="text-sm text-stone-600">Upload your CBE payment receipt for verification</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {expectedAmount && (
            <div className="flex items-center justify-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <DollarSign className="text-amber-600" size={20} />
              <span className="text-sm font-medium text-amber-800">
                Expected Amount: <strong>{expectedAmount.toLocaleString()} ETB</strong>
              </span>
            </div>
          )}

          <div
            className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
              dragActive 
                ? 'border-emerald-500 bg-emerald-50' 
                : selectedFile 
                  ? 'border-emerald-300 bg-emerald-50/50' 
                  : 'border-stone-300 hover:border-emerald-400 hover:bg-stone-50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragActive(false)}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />

            {previewUrl ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <img 
                    src={previewUrl} 
                    alt="Receipt preview" 
                    className="max-h-80 rounded-2xl shadow-lg border border-stone-200"
                  />
                  <button
                    onClick={handleClear}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
                <p className="text-sm text-stone-600">
                  {selectedFile?.name} ({(selectedFile?.size || 0) / 1024 / 1024 < 1 
                    ? `${(selectedFile?.size || 0) / 1024 < 1 ? (selectedFile?.size || 0) : (selectedFile?.size || 0) / 1024} KB`
                    : `${((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB`})
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto bg-stone-100 rounded-full flex items-center justify-center">
                  <Upload className="text-stone-400" size={36} />
                </div>
                <div>
                  <p className="text-stone-700 font-medium mb-2">
                    Drag and drop your receipt image here
                  </p>
                  <p className="text-sm text-stone-500 mb-4">
                    or choose a file from your device
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <label className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
                      <Image size={18} />
                      Choose File
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleUseCamera}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors"
                    >
                      <Camera size={18} />
                      Take Photo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {verificationResult && (
            <div className={`p-5 rounded-2xl border-2 ${
              verificationResult.success 
                ? 'bg-emerald-50 border-emerald-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              {verificationResult.success ? (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="text-emerald-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-emerald-800 mb-2">Payment Verified!</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/70 p-3 rounded-xl">
                        <p className="text-stone-500 text-xs">Amount</p>
                        <p className="font-bold text-emerald-700">{verificationResult.amount?.toLocaleString()} ETB</p>
                      </div>
                      <div className="bg-white/70 p-3 rounded-xl">
                        <p className="text-stone-500 text-xs">Reference</p>
                        <p className="font-bold text-emerald-700 font-mono">{verificationResult.reference || 'N/A'}</p>
                      </div>
                      {verificationResult.date && (
                        <div className="bg-white/70 p-3 rounded-xl col-span-2">
                          <p className="text-stone-500 text-xs">Date</p>
                          <p className="font-bold text-emerald-700">{new Date(verificationResult.date).toLocaleString()}</p>
                        </div>
                      )}
                      {verificationResult.payerName && (
                        <div className="bg-white/70 p-3 rounded-xl col-span-2">
                          <p className="text-stone-500 text-xs">Paid By</p>
                          <p className="font-bold text-emerald-700">{verificationResult.payerName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <XCircle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-800 mb-1">Verification Failed</h3>
                    <p className="text-sm text-red-700">{verificationResult.error}</p>
                    <button
                      onClick={handleClear}
                      className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleVerify}
              disabled={!selectedFile || isVerifying || (verificationResult?.success === true)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-lg ${
                !selectedFile || isVerifying || (verificationResult?.success === true)
                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Verify Payment
                </>
              )}
            </button>

            {selectedFile && !verificationResult?.success && (
              <button
                onClick={handleClear}
                className="px-6 py-3.5 bg-white border border-stone-200 text-stone-600 rounded-2xl text-sm font-semibold hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
              <Smartphone size={16} />
              Tips for clear receipt photos:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Ensure good lighting and the receipt is clearly visible</li>
              <li>• Include the entire receipt in the frame</li>
              <li>• Make sure the reference number and amount are readable</li>
              <li>• Avoid blurry or dark images</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
