import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Phone, BookOpen, ChevronLeft, ChevronDown, ChevronUp, AlertCircle, GraduationCap } from 'lucide-react';

export default function StudentRegistration() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [branches, setBranches] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isAddressOpen, setIsAddressOpen] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    full_name: '', birth_year: '', region: '', zone: '', woreda: '', kebele: '',
    phone: '', emergency_name: '', emergency_phone: '',
    program_id: '', program_degree: '', student_type: '', branch_id: '', status: 'Active',
    educational_history: '', previous_grade: '', password: ''
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
      
      if (bRes.data.length > 0) setFormData(prev => ({ ...prev, branch_id: bRes.data[0].id }));
      if (pRes.data.length > 0) setFormData(prev => ({ ...prev, program_id: pRes.data[0].id }));
    };
    fetchData();
  }, [token]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name) newErrors.full_name = 'Full name is required';
    if (!formData.birth_year) newErrors.birth_year = 'Birth year is required';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.program_id) newErrors.program_id = 'Program is required';
    if (!formData.previous_grade) newErrors.previous_grade = 'Previous grade is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    try {
      await axios.post('/api/students', { 
        ...formData,
        payment_verified: true,
        payment_amount: 0
      }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      showToast('Student registered successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      showToast('Failed to register student.', 'error');
    }
  };

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
            </div>
            
            <InputField label="Phone" name="phone" icon={Phone} required formData={formData} setFormData={setFormData} errors={errors} />
            <InputField label="Entrance/CGPA Grade" name="previous_grade" icon={GraduationCap} required formData={formData} setFormData={setFormData} errors={errors} />
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Branch</label>
              <select name="branch_id" value={formData.branch_id} onChange={(e) => setFormData({...formData, branch_id: e.target.value})} className={`w-full px-4 py-3 bg-stone-50 border ${errors.branch_id ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`} required>
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Program Degree</label>
              <select name="program_degree" value={formData.program_degree} onChange={(e) => setFormData({...formData, program_degree: e.target.value})} className={`w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none`} required>
                <option value="">Select Level</option>
                {['Masters', 'Degree', 'Diploma', 'Short Term', 'Certificate'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Program</label>
              <select name="program_id" value={formData.program_id} onChange={(e) => setFormData({...formData, program_id: e.target.value})} className={`w-full px-4 py-3 bg-stone-50 border ${errors.program_id ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`} required disabled={!formData.program_degree}>
                <option value="">{formData.program_degree ? 'Select Program' : 'Select Level First'}</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-stone-700 mb-2">Educational History</label>
              <textarea
                name="educational_history"
                value={formData.educational_history}
                onChange={(e) => setFormData({...formData, educational_history: e.target.value})}
                className={`w-full px-4 py-3 bg-stone-50 border ${errors.educational_history ? 'border-red-500' : 'border-stone-200'} rounded-2xl outline-none`}
                rows={3}
              />
            </div>
          </div>

          <AddressFields isAddressOpen={isAddressOpen} setIsAddressOpen={setIsAddressOpen} formData={formData} setFormData={setFormData} errors={errors} />

          <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg">
            Register Student
          </button>
        </form>
      </motion.div>
    </div>
  );
}

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

