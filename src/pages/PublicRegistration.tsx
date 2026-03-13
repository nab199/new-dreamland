import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Phone, Mail, BookOpen, Upload, ChevronLeft, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

export default function PublicRegistration() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isAddressOpen, setIsAddressOpen] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({ diploma: null, transcript: null, id_card: null, portrait: null });
  
  const [formData, setFormData] = useState({
    full_name: '', birth_year: '', region: '', zone: '', woreda: '', kebele: '',
    phone: '', email: '', emergency_name: '', emergency_phone: '',
    program_id: '', program_degree: '', student_type: '', branch_id: '',
    payment_method: 'cash', transaction_ref: '', last8Digits: '',
    education_history: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const [bRes, pRes] = await Promise.all([
        axios.get('/api/public/branches'),
        axios.get('/api/public/programs')
      ]);
      setBranches(bRes.data);
      setPrograms(pRes.data);
      
      if (bRes.data.length > 0 || pRes.data.length > 0) {
        setFormData(prev => ({
          ...prev,
          branch_id: bRes.data.length > 0 ? bRes.data[0].id : '',
          program_id: pRes.data.length > 0 ? pRes.data[0].id : ''
        }));
      }
    };
    fetchData();
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name) newErrors.full_name = 'Full name is required';
    if (!formData.birth_year || parseInt(formData.birth_year) < 1900) newErrors.birth_year = 'Valid birth year is required';
    if (!formData.phone || formData.phone.length < 10) newErrors.phone = 'Valid phone number is required';
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Valid email is required';
    if (!formData.student_type) newErrors.student_type = 'Student type is required';
    if (!formData.branch_id) newErrors.branch_id = 'Branch is required';
    if (!formData.program_id) newErrors.program_id = 'Program is required';
    if (!formData.program_degree) newErrors.program_degree = 'Program Degree is required';
    if (!files.diploma) newErrors.diploma = 'Diploma is required';
    if (!files.transcript) newErrors.transcript = 'Transcript is required';
    if (!files.id_card) newErrors.id_card = 'ID Card is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    try {
      // CBE Verification
      if (formData.payment_method === 'cbe_receipt') {
        try {
          await axios.post('/api/payments/verify', {
            reference: formData.transaction_ref,
            last8Digits: formData.last8Digits,
            student_id: 0 // Backend will handle student identification based on session/auth
          });
        } catch (err: any) {
          alert('Payment verification failed: ' + (err.response?.data?.error || 'Invalid details'));
          return;
        }
      }

      const documentUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(files)) {
        if (file) {
          const formData = new FormData();
          formData.append('file', file as Blob);
          const res = await axios.post('/api/public/upload', formData, { 
            headers: { 'Content-Type': 'multipart/form-data' } 
          });
          documentUrls[`${key}_url`] = res.data.url;
        }
      }

      await axios.post('/api/public/register-student', { ...formData, ...documentUrls });
      alert('Registration submitted successfully!');
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert('Failed to register.');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], field: string) => {
    setFiles(prev => ({ ...prev, [field]: acceptedFiles[0] }));
  }, []);

  const DropzoneField = ({ field, label }: { field: string, label: string }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: (acceptedFiles: File[]) => onDrop(acceptedFiles, field) } as any);
    return (
      <div>
        <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDragActive ? 'border-emerald-500 bg-emerald-50' : errors[field] ? 'border-red-500' : 'border-stone-200'} bg-stone-50`}>
          <input {...getInputProps()} />
          <p className="text-sm text-stone-600 text-center">{files[field] ? files[field]?.name : `Click or drag ${label} here`}</p>
        </div>
        {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
      </div>
    );
  };

  const InputField = ({ label, name, type = "text", icon: Icon, ...props }: any) => (
    <div className="relative">
      <label className="block text-sm font-semibold text-stone-700 mb-2">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />}
        <input 
          type={type} 
          name={name}
          value={formData[name as keyof typeof formData]}
          onChange={(e) => setFormData({...formData, [name]: e.target.value})}
          className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3 bg-stone-50 border ${errors[name] ? 'border-red-500' : 'border-stone-200'} rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none`}
          {...props}
        />
        {errors[name] && <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" size={18} />}
      </div>
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 p-10">
      <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 mb-6 font-semibold">
        <ChevronLeft size={20} /> Back to Login
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto bg-white p-10 rounded-3xl border border-stone-200 shadow-sm">
        <h2 className="text-2xl font-bold text-stone-900 mb-8">Student Registration</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <InputField label="Full Name" name="full_name" icon={User} required />
            <InputField label="Birth Year" name="birth_year" type="number" required />
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Student Type</label>
              <select name="student_type" value={formData.student_type} onChange={(e) => setFormData({...formData, student_type: e.target.value})} className={`w-full px-4 py-3 bg-stone-50 border ${errors.student_type ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`} required>
                <option value="">Select Type</option>
                {['Regular', 'Extension', 'Weekend', 'Distance'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.student_type && <p className="text-red-500 text-xs mt-1">{errors.student_type}</p>}
            </div>
            
            <InputField label="Phone" name="phone" icon={Phone} required />
            <InputField label="Email" name="email" type="email" icon={Mail} required />
            <InputField label="Emergency Contact Name" name="emergency_name" icon={User} required />
            <InputField label="Emergency Phone" name="emergency_phone" icon={Phone} required />
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-stone-700 mb-2">Educational Background</label>
              <textarea name="education_history" value={formData.education_history} onChange={(e) => setFormData({...formData, education_history: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none" rows={4} placeholder="List your previous schools, degrees, and years..."></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Payment Method</label>
              <select name="payment_method" value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none">
                <option value="cash">Cash</option>
                <option value="cbe_receipt">CBE Receipt</option>
              </select>
            </div>
            {formData.payment_method === 'cbe_receipt' && (
              <>
                <InputField label="Transaction Reference" name="transaction_ref" required />
                <InputField label="Last 8 Digits" name="last8Digits" required />
              </>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Branch</label>
              <select name="branch_id" onChange={(e) => setFormData({...formData, branch_id: e.target.value})} className={`w-full px-4 py-3 bg-stone-50 border ${errors.branch_id ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`} required>
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Program</label>
              <select name="program_id" onChange={(e) => setFormData({...formData, program_id: e.target.value})} className={`w-full px-4 py-3 bg-stone-50 border ${errors.program_id ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`} required>
                <option value="">Select Program</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.program_id && <p className="text-red-500 text-xs mt-1">{errors.program_id}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Program Degree</label>
              <select name="program_degree" value={formData.program_degree} onChange={(e) => setFormData({...formData, program_degree: e.target.value})} className={`w-full px-4 py-3 bg-stone-50 border ${errors.program_degree ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`} required>
                <option value="">Select Degree</option>
                {['Masters', 'Degree', 'Diploma', 'Certificate'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.program_degree && <p className="text-red-500 text-xs mt-1">{errors.program_degree}</p>}
            </div>
          </div>

          <div className="border border-stone-200 rounded-2xl overflow-hidden">
            <button type="button" onClick={() => setIsAddressOpen(!isAddressOpen)} className="w-full flex justify-between items-center p-6 bg-stone-50 font-bold text-stone-900">
              Address Information {isAddressOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <AnimatePresence>
              {isAddressOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="p-6 grid md:grid-cols-2 gap-6">
                  <InputField label="Region" name="region" icon={MapPin} />
                  <InputField label="Zone" name="zone" />
                  <InputField label="Woreda" name="woreda" />
                  <InputField label="Kebele" name="kebele" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
            <label className="block text-sm font-semibold text-stone-700 mb-4">Portrait Photo</label>
            <DropzoneField field="portrait" label="Portrait Photo" />
          </div>

          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
            <label className="block text-sm font-semibold text-stone-700 mb-4">Document Uploads</label>
            <div className="grid md:grid-cols-3 gap-4">
              <DropzoneField field="diploma" label="Diploma" />
              <DropzoneField field="transcript" label="Transcript" />
              <DropzoneField field="id_card" label="ID Card" />
            </div>
            {/* Remove the generic documents error */}
          </div>

          <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg">
            Register Student
          </button>
        </form>
      </motion.div>
    </div>
  );
}
