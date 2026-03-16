import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, MapPin, Phone, Mail, BookOpen, Upload, 
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle, 
  Globe, LayoutDashboard, Database, CreditCard, ShieldCheck
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import RegistrationVoucher from '../components/RegistrationVoucher';

// Ethiopian Regions and Zones
const ETHIOPIAN_ADDRESS_DATA: Record<string, string[]> = {
  'Addis Ababa': ['Arada', 'Kirkos', 'Gullele', 'Lideta', 'Yeka', 'Bole', 'Akaki-Kality', 'Nifas Silk-Lafto', 'Kolfe Keranio', 'Addis Ketema', 'Lemi Kura'],
  'Oromia': ['East Shewa', 'West Shewa', 'North Shewa', 'South West Shewa', 'Arsi', 'West Arsi', 'Bale', 'East Bale', 'Guji', 'West Guji', 'Borena', 'East Hararghe', 'West Hararghe', 'East Wollega', 'West Wollega', 'Horo Guduru Wollega', 'Kellem Wollega', 'Jimma', 'Ilu Aba Bora', 'Buno Bedele'],
  'Amhara': ['North Gondar', 'Central Gondar', 'South Gondar', 'West Gondar', 'North Wollo', 'South Wollo', 'North Shewa', 'East Gojjam', 'West Gojjam', 'Awi', 'Wag Hemra', 'Oromia Special'],
  'Tigray': ['Central Tigray', 'East Tigray', 'North West Tigray', 'South Tigray', 'South East Tigray', 'West Tigray', 'Mekelle Special Zone'],
  'Sidama': ['Sidama'],
  'Somali': ['Adadle', 'Afder', 'Dollo', 'Erer', 'Fafan', 'Jarar', 'Korahe', 'Liban', 'Nogob', 'Shabelle', 'Sitti'],
  'Afar': ['Zone 1 (Awsi Rasu)', 'Zone 2 (Kilbet Rasu)', 'Zone 3 (Gabi Rasu)', 'Zone 4 (Fantena Rasu)', 'Zone 5 (Hari Rasu)'],
  'Benishangul-Gumuz': ['Asosa', 'Kamashi', 'Metekel'],
  'Gambella': ['Anywaa', 'Majang', 'Nuer', 'Itang Special'],
  'Harari': ['Harar'],
  'South Ethiopia': ['Wolaita', 'Gamo', 'Gofa', 'Konso', 'South Omo', 'Ari', 'Basketo Special'],
  'South West Ethiopia': ['Kaffa', 'Sheka', 'Bench Sheko', 'Dawro', 'Konta', 'West Omo'],
  'Dire Dawa': ['Dire Dawa']
};

export default function PublicRegistration() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredData, setRegisteredData] = useState<any>(null);
  
  // Verification States
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationType, setVerificationType] = useState<'phone' | 'email' | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [files, setFiles] = useState<Record<string, File | null>>({ 
    diploma: null, transcript: null, id_card: null, portrait: null 
  });
  
  const [formData, setFormData] = useState({
    full_name: '', birth_year: '', region: '', zone: '', woreda: '', kebele: '',
    phone: '', email: '', emergency_name: '', emergency_phone: '',
    program_id: '', program_degree: '', student_type: '', branch_id: '',
    payment_method: 'cash', transaction_ref: '', last8Digits: '',
    education_history: '', password: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('dreamland_reg_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load draft');
      }
    }

    const fetchData = async () => {
      try {
        const [bRes, pRes] = await Promise.all([
          axios.get('/api/public/branches'),
          axios.get('/api/public/programs')
        ]);
        setBranches(bRes.data);
        setPrograms(pRes.data);
        if (!formData.branch_id && bRes.data.length > 0) setFormData(prev => ({ ...prev, branch_id: bRes.data[0].id }));
        if (!formData.program_id && pRes.data.length > 0) setFormData(prev => ({ ...prev, program_id: pRes.data[0].id }));
      } catch (err) {
        console.error('Failed to fetch initial data');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('dreamland_reg_draft', JSON.stringify(formData));
  }, [formData]);

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!formData.full_name) newErrors.full_name = 'Full name is required';
      const phoneRegex = /^(?:\+251|0)[79]\d{8}$/;
      if (!formData.phone) newErrors.phone = 'Phone number is required';
      else if (!phoneRegex.test(formData.phone)) newErrors.phone = 'Invalid Ethiopian phone format';
      if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Valid email is required';
      if (!formData.program_id) newErrors.program_id = 'Program is required';
    }
    if (currentStep === 2) {
      if (!formData.region) newErrors.region = 'Region is required';
      if (!formData.zone) newErrors.zone = 'Zone is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async (type: 'phone' | 'email') => {
    const identifier = type === 'phone' ? formData.phone : formData.email;
    try {
      await axios.post('/api/public/send-otp', { 
        identifier, 
        type, 
        full_name: formData.full_name 
      });
      setVerificationType(type);
      setIsVerifying(true);
      setOtpValue('');
      showToast(`Verification code sent to your ${type}`, 'info');
    } catch (err) {
      showToast('Failed to send verification code.', 'error');
    }
  };

  const handleVerifyOTP = async () => {
    const identifier = verificationType === 'phone' ? formData.phone : formData.email;
    try {
      await axios.post('/api/public/verify-otp', { identifier, code: otpValue });
      if (verificationType === 'phone') {
        setIsPhoneVerified(true);
        showToast('Phone number verified!');
      } else {
        setIsEmailVerified(true);
        showToast('Email address verified!');
      }
      setIsVerifying(false);
      setVerificationType(null);
    } catch (err) {
      showToast('Invalid or expired verification code.', 'error');
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) return;
    if (step === 1) {
      if (!isPhoneVerified) { handleSendOTP('phone'); return; }
      if (!isEmailVerified) { handleSendOTP('email'); return; }
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);
  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'en' ? 'am' : 'en');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    setIsSubmitting(true);
    try {
      if (formData.payment_method === 'cbe_receipt') {
        await axios.post('/api/payments/verify-cbe', { reference: formData.transaction_ref, last8Digits: formData.last8Digits });
      }
      const documentUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(files)) {
        if (file) {
          const fileData = new FormData();
          fileData.append('file', file);
          const res = await axios.post('/api/public/upload', fileData);
          documentUrls[`${key}_url`] = res.data.url;
        }
      }
      const res = await axios.post('/api/public/register-student', { ...formData, ...documentUrls, password: formData.password || 'password123' });
      
      const selectedProgram = programs.find(p => p.id == formData.program_id);
      const selectedBranch = branches.find(b => b.id == formData.branch_id);
      
      setRegisteredData({
        studentName: formData.full_name,
        studentId: res.data.student_id_code,
        program: selectedProgram?.name || 'Assigned Program',
        branch: selectedBranch?.name || 'Main Branch',
        amount: 5000 // Default registration fee
      });
      
      localStorage.removeItem('dreamland_reg_draft');
      showToast('Registration successful!', 'success');
    } catch (err: any) {
      showToast('Registration failed: ' + (err.response?.data?.error || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registeredData) {
    return (
      <div className="min-h-screen bg-stone-50 py-20 px-6">
        <RegistrationVoucher {...registeredData} />
        <div className="max-w-2xl mx-auto mt-10 text-center">
          <button 
            onClick={() => navigate('/login')}
            className="text-emerald-600 font-black flex items-center gap-2 mx-auto hover:underline"
          >
            Go to Student Portal <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  const onDrop = useCallback((acceptedFiles: File[], field: string) => {
    setFiles(prev => ({ ...prev, [field]: acceptedFiles[0] }));
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-20">
      <AnimatePresence>
        {isVerifying && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md p-8 rounded-[32px] shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto"><ShieldCheck size={32} /></div>
              <h3 className="text-xl font-black">Verify your {verificationType}</h3>
              <p className="text-stone-500 text-sm">Code sent to: <span className="font-bold text-stone-900">{verificationType === 'phone' ? formData.phone : formData.email}</span></p>
              <input type="text" maxLength={6} value={otpValue} onChange={(e) => setOtpValue(e.target.value)} placeholder="0 0 0 0 0 0" className="w-full text-center text-3xl font-black tracking-[12px] py-4 bg-stone-50 border-2 border-stone-100 rounded-2xl outline-none focus:border-emerald-500" />
              <button onClick={handleVerifyOTP} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-lg">Confirm & Continue</button>
              <button onClick={() => setIsVerifying(false)} className="text-stone-400 text-sm font-bold hover:text-stone-600">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold">D</div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">DREAMLAND</h1>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Admissions Portal</p>
            </div>
          </div>
          <button onClick={toggleLanguage} className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-bold"><Globe size={18} />{i18n.language === 'en' ? 'አማርኛ' : 'English'}</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-10">
        <div className="flex items-center gap-4 mb-10">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-stone-200 text-stone-500'}`}>
                  {step > s ? <CheckCircle size={20} /> : s}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= s ? 'text-emerald-700' : 'text-stone-400'}`}>{s === 1 ? t('registration') : s === 2 ? t('address') : t('payment')}</span>
              </div>
              {s < 3 && <div className={`flex-1 h-1 rounded-full transition-all ${step > s ? 'bg-emerald-600' : 'bg-stone-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white border-2 border-stone-100 rounded-[32px] p-8 md:p-12 shadow-xl shadow-stone-200/50">
          {step === 1 && (
            <div className="space-y-8">
              <div className="flex items-center gap-4 border-b border-stone-100 pb-6">
                <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-emerald-600"><User size={24} /></div>
                <div><h2 className="text-2xl font-black text-stone-900">{t('registration')}</h2><p className="text-stone-500 text-sm font-medium">Personal and academic identification</p></div>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <InputField label={t('full_name')} name="full_name" icon={User} placeholder="e.g. Abebe Kebede" formData={formData} setFormData={setFormData} errors={errors} />
                <InputField label={t('birth_year')} name="birth_year" type="number" placeholder="e.g. 1995" formData={formData} setFormData={setFormData} errors={errors} />
                <div className="relative"><InputField label={t('phone')} name="phone" icon={Phone} placeholder="09... or +251..." formData={formData} setFormData={setFormData} errors={errors} />{isPhoneVerified && <div className="absolute right-12 top-[44px] text-emerald-500 flex items-center gap-1 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"><ShieldCheck size={12}/> Verified</div>}</div>
                <div className="relative"><InputField label={t('email')} name="email" icon={Mail} type="email" placeholder="email@example.com" formData={formData} setFormData={setFormData} errors={errors} />{isEmailVerified && <div className="absolute right-12 top-[44px] text-emerald-500 flex items-center gap-1 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"><ShieldCheck size={12}/> Verified</div>}</div>
                <div className="space-y-2"><label className="text-sm font-bold text-stone-700 block">{t('student_type')}</label><select value={formData.student_type} onChange={(e) => setFormData({...formData, student_type: e.target.value})} className="w-full px-4 py-3.5 bg-stone-50 border-2 border-stone-100 rounded-2xl outline-none focus:border-emerald-500 font-semibold"><option value="">Select Type</option>{['Regular', 'Extension', 'Weekend', 'Distance'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="space-y-2"><label className="text-sm font-bold text-stone-700 block">{t('program')}</label><select value={formData.program_id} onChange={(e) => setFormData({...formData, program_id: e.target.value})} className="w-full px-4 py-3.5 bg-stone-50 border-2 border-stone-100 rounded-2xl outline-none focus:border-emerald-500 font-semibold"><option value="">Select Program</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div className="space-y-2"><label className="text-sm font-bold text-stone-700 block">{t('program_degree')}</label><select value={formData.program_degree} onChange={(e) => setFormData({...formData, program_degree: e.target.value})} className="w-full px-4 py-3.5 bg-stone-50 border-2 border-stone-100 rounded-2xl outline-none focus:border-emerald-500 font-semibold"><option value="">Select Level</option>{['Masters', 'Degree', 'Diploma', 'Certificate'].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div className="space-y-2"><label className="text-sm font-bold text-stone-700 block">{t('branch')}</label><select value={formData.branch_id} onChange={(e) => setFormData({...formData, branch_id: e.target.value})} className="w-full px-4 py-3.5 bg-stone-50 border-2 border-stone-100 rounded-2xl outline-none focus:border-emerald-500 font-semibold">{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10">
              <div className="flex items-center gap-4 border-b border-stone-100 pb-6"><div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-emerald-600"><MapPin size={24} /></div><div><h2 className="text-2xl font-black text-stone-900">{t('address')}</h2><p className="text-stone-500 text-sm font-medium">Where do you currently reside?</p></div></div>
              <div className="grid md:grid-cols-2 gap-8"><div className="space-y-2"><label className="text-sm font-bold text-stone-700 block">{t('region')}</label><select value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value, zone: ''})} className="w-full px-4 py-3.5 bg-stone-50 border-2 border-stone-100 rounded-2xl outline-none focus:border-emerald-500 font-semibold"><option value="">Select Region</option>{Object.keys(ETHIOPIAN_ADDRESS_DATA).map(r => <option key={r} value={r}>{r}</option>)}</select></div><div className="space-y-2"><label className="text-sm font-bold text-stone-700 block">{t('zone')}</label><select value={formData.zone} onChange={(e) => setFormData({...formData, zone: e.target.value})} disabled={!formData.region} className="w-full px-4 py-3.5 bg-stone-50 border-2 border-stone-100 rounded-2xl outline-none focus:border-emerald-500 font-semibold disabled:opacity-50"><option value="">Select Zone</option>{formData.region && ETHIOPIAN_ADDRESS_DATA[formData.region].map(z => <option key={z} value={z}>{z}</option>)}</select></div><InputField label={t('woreda')} name="woreda" placeholder="e.g. Woreda 01" formData={formData} setFormData={setFormData} errors={errors} /><InputField label={t('kebele')} name="kebele" placeholder="e.g. Kebele 05" formData={formData} setFormData={setFormData} errors={errors} /></div>
              <div className="space-y-6 pt-6"><div className="flex items-center gap-4 text-emerald-700 mb-2"><Upload size={20} /><h3 className="font-black uppercase tracking-widest text-xs">{t('documents')}</h3></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><DropzoneField field="portrait" label="Portrait" files={files} onDrop={onDrop} /><DropzoneField field="id_card" label="ID Card" files={files} onDrop={onDrop} /><DropzoneField field="diploma" label="Diploma" files={files} onDrop={onDrop} /><DropzoneField field="transcript" label="Transcript" files={files} onDrop={onDrop} /></div></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="flex items-center gap-4 border-b border-stone-100 pb-6"><div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-emerald-600"><CreditCard size={24} /></div><div><h2 className="text-2xl font-black text-stone-900">{t('payment')}</h2><p className="text-stone-500 text-sm font-medium">Verify your registration fee</p></div></div>
              <div className="space-y-8"><div className="flex gap-4 p-1 bg-stone-100 rounded-2xl">{['cash', 'cbe_receipt'].map((method) => (<button key={method} type="button" onClick={() => setFormData({...formData, payment_method: method})} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${formData.payment_method === method ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500 hover:bg-stone-200'}`}>{method === 'cash' ? 'Pay at Branch' : 'CBE Receipt'}</button>))}</div>
              {formData.payment_method === 'cbe_receipt' && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-6 bg-emerald-50 p-8 rounded-3xl border-2 border-emerald-100"><InputField label="CBE Transaction Reference" name="transaction_ref" placeholder="FT..." formData={formData} setFormData={setFormData} errors={errors} /><InputField label="Last 8 Digits" name="last8Digits" placeholder="Verification digits" maxLength={8} formData={formData} setFormData={setFormData} errors={errors} /></motion.div>)}
              <InputField label="Create Account Password" name="password" type="password" icon={Database} placeholder="At least 6 characters" formData={formData} setFormData={setFormData} errors={errors} /></div>
            </div>
          )}

          <div className="flex gap-4 mt-12 pt-8 border-t border-stone-100">
            {step > 1 && (<button type="button" onClick={prevStep} className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-200 transition-all"><ChevronLeft size={20} /> {t('previous')}</button>)}
            {step < 3 ? (<button type="button" onClick={nextStep} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200">{t('next')} <ChevronRight size={20} /></button>) : (<button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50">{isSubmitting ? 'Processing...' : t('submit')} <CheckCircle size={20} /></button>)}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const DropzoneField = ({ field, label, files, onDrop }: { field: string, label: string, files: any, onDrop: any }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: (acceptedFiles: File[]) => onDrop(acceptedFiles, field),
    multiple: false,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'], 'application/pdf': ['.pdf'] }
  } as any);
  return (
    <div className="flex-1">
      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">{label}</label>
      <div {...getRootProps()} className={`p-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all h-32 flex flex-col items-center justify-center text-center ${isDragActive ? 'border-emerald-500 bg-emerald-50' : files[field] ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-white hover:border-emerald-400'}`}>
        <input {...getInputProps()} />
        {files[field] ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="text-emerald-500 mb-1" size={24} />
            <p className="text-[10px] text-stone-600 truncate max-w-[100px]">{files[field]?.name}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-stone-400">
            <Upload className="mb-1" size={24} />
            <p className="text-[10px] leading-tight font-bold">UPLOAD</p>
          </div>
        )}
      </div>
    </div>
  );
};

const InputField = ({ label, name, icon: Icon, type = "text", formData, setFormData, errors, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-stone-700 block">{label}</label>
    <div className="relative group">
      {Icon && <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors[name] ? 'text-red-400' : 'text-stone-400 group-focus-within:text-emerald-500'}`} size={18} />}
      <input 
        type={type}
        value={formData[name as keyof typeof formData]}
        onChange={(e) => {
          let val = e.target.value;
          if (name === 'transaction_ref') val = val.toUpperCase();
          setFormData({...formData, [name]: val});
        }}
        className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3.5 bg-stone-50 border-2 rounded-2xl outline-none transition-all ${errors[name] ? 'border-red-200 focus:border-red-500 bg-red-50' : 'border-stone-100 focus:border-emerald-500 bg-stone-50'}`}
        {...props}
      />
      {errors[name] && <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" size={18} />}
    </div>
    {errors[name] && <p className="text-red-500 text-[11px] font-semibold">{errors[name]}</p>}
  </div>
);
