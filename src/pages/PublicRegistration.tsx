import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Phone, 
  ChevronLeft, 
  AlertCircle, 
  GraduationCap,
  ShieldCheck,
  Send,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';

export default function PublicRegistration() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '', birth_date: '', region: '', zone: '', woreda: '', kebele: '',
    phone: '', emergency_name: '', emergency_phone: '',
    program_id: '', program_degree: '', student_type: '', branch_id: '',
    previous_grade: '', password: '', confirm_password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const availablePrograms = React.useMemo(() => {
    if (!formData.program_degree) return [];
    return programs.filter((program) => program.degree_level === formData.program_degree);
  }, [formData.program_degree, programs]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bRes, pRes] = await Promise.all([
          axios.get('/api/public/branches'),
          axios.get('/api/public/programs')
        ]);
        setBranches(bRes.data);
        setPrograms(pRes.data);
      } catch (err) {
        console.error('Failed to fetch public data', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.program_id) return prev;
      const stillAvailable = availablePrograms.some((program) => String(program.id) === String(prev.program_id));
      return stillAvailable ? prev : { ...prev, program_id: '' };
    });
  }, [availablePrograms]);

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (!formData.full_name) newErrors.full_name = 'Full name is required';
      if (!formData.phone) newErrors.phone = 'Phone number is required';
    } else if (currentStep === 2) {
      if (!formData.program_id) newErrors.program_id = 'Program is required';
      if (!formData.program_degree) newErrors.program_degree = 'Degree level is required';
      if (!formData.branch_id) newErrors.branch_id = 'Branch is required';
      if (!formData.previous_grade) newErrors.previous_grade = 'Previous grade is required';
    } else if (currentStep === 3) {
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match';
      if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    
    setIsLoading(true);
    try {
      const response = await axios.post('/api/public/register-student', formData);
      showToast(`Registration successful. Username: ${response.data.username}`, 'success');
      navigate('/login');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Registration failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-stone-50 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 mb-8 font-bold transition-colors"
        >
          <ChevronLeft size={20} /> Back to Home
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-stone-200/50 border border-stone-100 overflow-hidden">
          {/* Progress Bar */}
          <div className="h-2 bg-stone-100 flex">
            <motion.div 
              className="h-full bg-emerald-600"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          <div className="p-10 md:p-16">
            <div className="mb-12">
              <h2 className="text-3xl font-black text-stone-900 mb-2">Apply to Dreamland</h2>
              <p className="text-stone-500 font-medium">Step {step} of 3: {
                step === 1 ? 'Personal Information' : 
                step === 2 ? 'Academic Choices' : 'Security'
              }</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      <InputField label="Full Name" name="full_name" icon={User} required formData={formData} setFormData={setFormData} errors={errors} />
                      <InputField label="Birth Date" name="birth_date" type="date" required formData={formData} setFormData={setFormData} errors={errors} />
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-bold text-stone-700 mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input 
                          type="tel" 
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className={`w-full pl-12 pr-4 py-4 bg-stone-50 border ${errors.phone ? 'border-red-500' : 'border-stone-200'} rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all`}
                          placeholder="+251..."
                          required
                        />
                        {errors.phone && <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" size={18} />}
                      </div>
                      {errors.phone && <p className="text-red-500 text-xs mt-2 font-medium">{errors.phone}</p>}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
                      <InputField label="Emergency Contact Name" name="emergency_name" icon={User} formData={formData} setFormData={setFormData} errors={errors} />
                      <InputField label="Emergency Phone" name="emergency_phone" icon={Phone} formData={formData} setFormData={setFormData} errors={errors} />
                    </div>

                    <button 
                      type="button" 
                      onClick={nextStep}
                      className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2"
                    >
                      Continue to Academics <ArrowRight size={20} />
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">Program Degree</label>
                        <select 
                          name="program_degree" 
                          value={formData.program_degree} 
                          onChange={(e) => setFormData({...formData, program_degree: e.target.value, program_id: ''})} 
                          className="w-full px-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        >
                          <option value="">Select Level</option>
                          {['Masters', 'Degree', 'Diploma', 'Short Term'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">Program</label>
                        <select 
                          name="program_id" 
                          value={formData.program_id} 
                          onChange={(e) => setFormData({...formData, program_id: e.target.value})} 
                          className="w-full px-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                          disabled={!formData.program_degree}
                        >
                          <option value="">{availablePrograms.length > 0 ? 'Select Program' : 'No programs available for this level'}</option>
                          {availablePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">Branch</label>
                        <select 
                          name="branch_id" 
                          value={formData.branch_id} 
                          onChange={(e) => setFormData({...formData, branch_id: e.target.value})} 
                          className="w-full px-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        >
                          <option value="">Select Branch</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <InputField label="Entrance/CGPA Grade" name="previous_grade" icon={GraduationCap} required formData={formData} setFormData={setFormData} errors={errors} />
                    </div>

                    <div className="flex gap-4 pt-6">
                      <button 
                        type="button" 
                        onClick={prevStep}
                        className="flex-1 py-4 border-2 border-stone-200 text-stone-600 rounded-2xl font-bold hover:bg-stone-50 transition-all"
                      >
                        Back
                      </button>
                      <button 
                        type="button" 
                        onClick={nextStep}
                        className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                      >
                        Almost Done
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="p-6 bg-stone-900 rounded-[2rem] text-white flex items-center gap-6 mb-8">
                      <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                        <ShieldCheck size={32} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">Secure Your Account</h4>
                        <p className="text-stone-400 text-sm">Create a password to access your student portal later.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <InputField label="Password" name="password" type="password" icon={Lock} required formData={formData} setFormData={setFormData} errors={errors} />
                      <InputField label="Confirm Password" name="confirm_password" type="password" icon={Lock} required formData={formData} setFormData={setFormData} errors={errors} />
                    </div>

                    <div className="flex gap-4 pt-6">
                      <button 
                        type="button" 
                        onClick={prevStep}
                        className="flex-1 py-4 border-2 border-stone-200 text-stone-600 rounded-2xl font-bold hover:bg-stone-50 transition-all"
                      >
                        Back
                      </button>
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 shadow-xl shadow-emerald-600/30 flex items-center justify-center"
                      >
                        {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Complete Application'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const InputField = ({ label, name, type = "text", icon: Icon, formData, setFormData, errors, ...props }: any) => (
  <div className="relative">
    <label className="block text-sm font-bold text-stone-700 mb-2">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />}
      <input 
        type={type} 
        name={name}
        value={formData[name as keyof typeof formData]}
        onChange={(e) => setFormData({...formData, [name]: e.target.value})}
        className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-4 bg-stone-50 border ${errors[name] ? 'border-red-500' : 'border-stone-200'} rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all`}
        {...props}
      />
      {errors[name] && <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" size={18} />}
    </div>
    {errors[name] && <p className="text-red-500 text-xs mt-1 font-medium">{errors[name]}</p>}
  </div>
);
