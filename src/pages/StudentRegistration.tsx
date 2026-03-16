import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Phone, Mail, BookOpen, Upload, ChevronLeft, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

export default function StudentRegistration() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isAddressOpen, setIsAddressOpen] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({ portrait_id_photo: null });
  
  const [formData, setFormData] = useState({
    full_name: '', birth_year: '', region: '', zone: '', woreda: '', kebele: '',
    phone: '', email: '', emergency_name: '', emergency_phone: '',
    program_id: '', program_degree: '', student_type: '', branch_id: '', status: 'Active',
    educational_history: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const [bRes, pRes] = await Promise.all([
        axios.get('/api/branches', { headers }),
        axios.get('/api/programs', { headers })
      ]);
      setBranches(bRes.data);
      setPrograms(pRes.data);
      
      // Pre-select first options if available
      if (bRes.data.length > 0 || pRes.data.length > 0) {
        setFormData(prev => ({
          ...prev,
          branch_id: bRes.data.length > 0 ? bRes.data[0].id : '',
          program_id: pRes.data.length > 0 ? pRes.data[0].id : ''
        }));
      }
    };
    fetchData();
  }, [token]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name) newErrors.full_name = 'Full name is required';
    if (!formData.birth_year || parseInt(formData.birth_year) < 1900) newErrors.birth_year = 'Valid birth year is required';
    if (!formData.phone || formData.phone.length < 10) newErrors.phone = 'Valid phone number is required';
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Valid email is required';
    if (!formData.student_type) newErrors.student_type = 'Student type is required';
    if (!['Active', 'Inactive', 'Probation'].includes(formData.status)) newErrors.status = 'Invalid status';
    if (!formData.branch_id) newErrors.branch_id = 'Branch is required';
    if (!formData.program_id) newErrors.program_id = 'Program is required';
    if (!formData.program_degree) newErrors.program_degree = 'Program Degree is required';
    if (!formData.educational_history) newErrors.educational_history = 'Educational history is required';
    if (!files.portrait_id_photo) newErrors.portrait_id_photo = 'Portrait ID photo is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    try {
      const documentUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(files)) {
        if (file) {
          const formData = new FormData();
          formData.append('file', file as Blob);
          const res = await axios.post('/api/upload', formData, { 
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } 
          });
          documentUrls[`${key}_url`] = res.data.url;
        }
      }

      await axios.post('/api/students', { ...formData, ...documentUrls }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      alert('Student registered successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to register student.');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], field: string) => {
    setFiles(prev => ({ ...prev, [field]: acceptedFiles[0] }));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 p-10">
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 mb-6 font-semibold">
        <ChevronLeft size={20} /> Back to Dashboard
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto bg-white p-10 rounded-3xl border border-stone-200 shadow-sm">
        <h2 className="text-2xl font-bold text-stone-900 mb-8">Student Registration</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <InputField label="Full Name" name="full_name" icon={User} required formData={formData} setFormData={setFormData} errors={errors} />
            <InputField label="Birth Year" name="birth_year" type="number" required formData={formData} setFormData={setFormData} errors={errors} />
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Student Type</label>
              <select name="student_type" value={formData.student_type} onChange={(e) => setFormData({...formData, student_type: e.target.value})} className={`w-full px-4 py-3 bg-stone-50 border ${errors.student_type ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`} required>
                <option value="">Select Type</option>
                {['Regular', 'Extension', 'Weekend', 'Distance'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.student_type && <p className="text-red-500 text-xs mt-1">{errors.student_type}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Student Status</label>
              <select name="status" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none" required>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Probation">Probation</option>
              </select>
            </div>

            <InputField label="Phone" name="phone" icon={Phone} required formData={formData} setFormData={setFormData} errors={errors} />
            <InputField label="Email" name="email" type="email" icon={Mail} required formData={formData} setFormData={setFormData} errors={errors} />
            <InputField label="Emergency Contact Name" name="emergency_name" icon={User} required formData={formData} setFormData={setFormData} errors={errors} />
            <InputField label="Emergency Phone" name="emergency_phone" icon={Phone} required formData={formData} setFormData={setFormData} errors={errors} />
            
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-stone-700 mb-2">Educational History</label>
              <textarea
                name="educational_history"
                value={formData.educational_history}
                onChange={(e) => setFormData({...formData, educational_history: e.target.value})}
                className={`w-full px-4 py-3 bg-stone-50 border ${errors.educational_history ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`}
                rows={4}
                required
              />
              {errors.educational_history && <p className="text-red-500 text-xs mt-1">{errors.educational_history}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Branch</label>
              <select name="branch_id" value={formData.branch_id} onChange={(e) => setFormData({...formData, branch_id: e.target.value})} className={`w-full px-4 py-3 bg-stone-50 border ${errors.branch_id ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`} required>
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Program</label>
              <select name="program_id" value={formData.program_id} onChange={(e) => setFormData({...formData, program_id: e.target.value})} className={`w-full px-4 py-3 bg-stone-50 border ${errors.program_id ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`} required>
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

          <AddressFields isAddressOpen={isAddressOpen} setIsAddressOpen={setIsAddressOpen} formData={formData} setFormData={setFormData} errors={errors} />

          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
            <label className="block text-sm font-semibold text-stone-700 mb-4">Portrait ID Photo</label>
            <DropzoneField field="portrait_id_photo" label="Portrait ID Photo" files={files} onDrop={onDrop} />
            {errors.portrait_id_photo && <p className="text-red-500 text-xs mt-2">{errors.portrait_id_photo}</p>}
          </div>

          <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg">
            Register Student
          </button>
        </form>
      </motion.div>
    </div>
  );
}

const DropzoneField = ({ field, label, files, onDrop }: { field: string, label: string, files: any, onDrop: any }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: (acceptedFiles: File[]) => onDrop(acceptedFiles, field) } as any);
  return (
    <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-stone-50'}`}>
      <input {...getInputProps()} />
      <p className="text-sm text-stone-600 text-center">{files[field] ? files[field]?.name : `Click or drag ${label} here`}</p>
    </div>
  );
};

const InputField = ({ label, name, type = "text", icon: Icon, formData, setFormData, errors, ...props }: any) => (
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

const AddressFields = ({ isAddressOpen, setIsAddressOpen, formData, setFormData, errors }: any) => (
  <div className="border border-stone-200 rounded-2xl overflow-hidden">
    <button type="button" onClick={() => setIsAddressOpen(!isAddressOpen)} className="w-full flex justify-between items-center p-6 bg-stone-50 font-bold text-stone-900">
      Address Information {isAddressOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
    <AnimatePresence>
      {isAddressOpen && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="p-6 grid md:grid-cols-2 gap-6">
          <InputField label="Region" name="region" icon={MapPin} formData={formData} setFormData={setFormData} errors={errors} />
          <InputField label="Zone" name="zone" formData={formData} setFormData={setFormData} errors={errors} />
          <InputField label="Woreda" name="woreda" formData={formData} setFormData={setFormData} errors={errors} />
          <InputField label="Kebele" name="kebele" formData={formData} setFormData={setFormData} errors={errors} />
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
